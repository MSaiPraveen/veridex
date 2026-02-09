import mongoose, { ClientSession, Connection } from 'mongoose';

/**
 * Transaction Options
 */
export interface TransactionOptions {
  /**
   * Maximum number of retries on transient errors
   */
  maxRetries?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelayMs?: number;
  
  /**
   * Read concern level
   */
  readConcern?: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot';
  
  /**
   * Write concern
   */
  writeConcern?: {
    w?: number | 'majority';
    j?: boolean;
    wtimeout?: number;
  };
  
  /**
   * Read preference
   */
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
}

const DEFAULT_OPTIONS: TransactionOptions = {
  maxRetries: 3,
  retryDelayMs: 100,
  readConcern: 'majority',
  writeConcern: { w: 'majority', j: true },
};

/**
 * Check if error is a transient transaction error (can be retried)
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error && 'errorLabels' in error) {
    const labels = (error as any).errorLabels as string[];
    return labels?.includes('TransientTransactionError');
  }
  return false;
}

/**
 * Check if error is an unknown transaction commit result (can retry commit)
 */
function isUnknownCommitResult(error: unknown): boolean {
  if (error instanceof Error && 'errorLabels' in error) {
    const labels = (error as any).errorLabels as string[];
    return labels?.includes('UnknownTransactionCommitResult');
  }
  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function within a MongoDB transaction with automatic retry
 * 
 * @param fn - The async function to execute within the transaction
 * @param options - Transaction options
 * @returns The result of the function
 * 
 * @example
 * const result = await withTransaction(async (session) => {
 *   await User.create([{ name: 'John' }], { session });
 *   await Account.create([{ userId: user._id }], { session });
 *   return user;
 * });
 */
export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const session = await mongoose.startSession();
  
  let result: T;
  let retries = 0;
  
  try {
    while (true) {
      try {
        session.startTransaction({
          readConcern: { level: opts.readConcern },
          writeConcern: opts.writeConcern,
          readPreference: opts.readPreference,
        } as any);
        
        result = await fn(session);
        
        // Commit with retry on unknown result
        while (true) {
          try {
            await session.commitTransaction();
            break;
          } catch (commitError) {
            if (isUnknownCommitResult(commitError) && retries < (opts.maxRetries || 3)) {
              retries++;
              console.warn(`[Transaction] Unknown commit result, retrying (${retries}/${opts.maxRetries})`);
              await sleep(opts.retryDelayMs || 100);
              continue;
            }
            throw commitError;
          }
        }
        
        return result;
        
      } catch (error) {
        // Abort transaction if active
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        
        // Retry on transient errors
        if (isTransientError(error) && retries < (opts.maxRetries || 3)) {
          retries++;
          console.warn(`[Transaction] Transient error, retrying (${retries}/${opts.maxRetries}):`, 
            error instanceof Error ? error.message : error);
          await sleep(opts.retryDelayMs || 100);
          continue;
        }
        
        throw error;
      }
    }
  } finally {
    await session.endSession();
  }
}

/**
 * Transaction decorator for service methods
 * 
 * @example
 * class UserService {
 *   @transactional()
 *   async createWithAccount(userData: CreateUserInput, session?: ClientSession) {
 *     const user = await User.create([userData], { session });
 *     await Account.create([{ userId: user._id }], { session });
 *     return user;
 *   }
 * }
 */
export function transactional(options: TransactionOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Check if session is already provided (nested transaction)
      const lastArg = args[args.length - 1];
      if (lastArg instanceof mongoose.mongo.ClientSession) {
        // Already in a transaction, just run the method
        return originalMethod.apply(this, args);
      }
      
      // Wrap in transaction
      return withTransaction(async (session) => {
        return originalMethod.apply(this, [...args, session]);
      }, options);
    };
    
    return descriptor;
  };
}

/**
 * Run multiple operations in a single transaction
 * 
 * @param operations - Array of operations to execute
 * @param options - Transaction options
 * 
 * @example
 * await runInTransaction([
 *   async (session) => User.create([userData], { session }),
 *   async (session) => AuditLog.create([logEntry], { session }),
 * ]);
 */
export async function runInTransaction(
  operations: Array<(session: ClientSession) => Promise<unknown>>,
  options: TransactionOptions = {}
): Promise<unknown[]> {
  return withTransaction(async (session) => {
    const results: unknown[] = [];
    for (const operation of operations) {
      results.push(await operation(session));
    }
    return results;
  }, options);
}

/**
 * Create a transaction context that can be passed to multiple service calls
 * 
 * @example
 * const txContext = await createTransactionContext();
 * try {
 *   await userService.create(userData, txContext.session);
 *   await accountService.create(accountData, txContext.session);
 *   await txContext.commit();
 * } catch (error) {
 *   await txContext.abort();
 *   throw error;
 * }
 */
export async function createTransactionContext(options: TransactionOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const session = await mongoose.startSession();
  
  session.startTransaction({
    readConcern: { level: opts.readConcern },
    writeConcern: opts.writeConcern,
    readPreference: opts.readPreference,
  } as any);
  
  return {
    session,
    
    async commit(): Promise<void> {
      await session.commitTransaction();
      await session.endSession();
    },
    
    async abort(): Promise<void> {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      await session.endSession();
    },
    
    inTransaction(): boolean {
      return session.inTransaction();
    },
  };
}

export default withTransaction;
