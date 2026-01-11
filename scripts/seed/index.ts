/* eslint-disable no-console */
import { log } from '../utils/logger';
import { disconnectAll } from '../utils/mongo';

/**
 * Seed function contract.
 * All seed files must export a function matching this signature.
 */
type SeedFn = () => Promise<void>;

interface SeedDefinition {
  name: string;
  run: SeedFn;
}

/**
 * Import seeds here.
 * These files must NOT auto-execute.
 */
import { seedConsumers } from './consumers.seed';
import { seedMerchants } from './merchants.seed';
import { seedProducts } from './products.seed';
import { seedDocuments } from './documents.seed';

/**
 * Ordered seed execution.
 * 
 * ⚠️ DO NOT REORDER CASUALLY
 * 
 * Order matters because:
 * 1. Consumers must exist before merchants reference them
 * 2. Merchants must exist before products are created
 * 3. Products must exist before documents are attached
 * 4. Documents depend on products and merchants
 */
const SEEDS: SeedDefinition[] = [
  { name: 'Consumers', run: seedConsumers },
  { name: 'Merchants', run: seedMerchants },
  { name: 'Products', run: seedProducts },
  { name: 'Documents', run: seedDocuments },
];

/**
 * Main seed orchestrator.
 * Runs all seeds in order, fails fast on any error.
 */
async function runSeeds(): Promise<void> {
  console.log();
  console.log('🌱 ══════════════════════════════════════════');
  console.log('   VERIDEX SEED RUNNER');
  console.log('══════════════════════════════════════════════');
  console.log();

  const startTime = Date.now();
  let completedCount = 0;

  try {
    for (const seed of SEEDS) {
      const seedStart = Date.now();
      
      log.section(seed.name);
      log.step(`Running seed: ${seed.name}`);

      try {
        await seed.run();
        
        const duration = Date.now() - seedStart;
        log.success(`${seed.name} completed (${duration}ms)`);
        completedCount++;
      } catch (err) {
        log.error(`${seed.name} FAILED`, err);
        throw err; // Re-throw to trigger cleanup
      }
    }

    const totalDuration = Date.now() - startTime;

    log.blank();
    console.log('══════════════════════════════════════════════');
    log.success(`All ${completedCount} seeds completed successfully`);
    console.log(`⏱  Total time: ${totalDuration}ms`);
    console.log('══════════════════════════════════════════════');
    log.blank();

  } catch (err) {
    log.blank();
    console.log('══════════════════════════════════════════════');
    log.error(`Seed process aborted after ${completedCount}/${SEEDS.length} seeds`);
    console.log('══════════════════════════════════════════════');
    log.blank();
    
    // Cleanup connections before exit
    await disconnectAll();
    process.exit(1);
  }

  // Clean shutdown
  await disconnectAll();
  process.exit(0);
}

/**
 * Execute only when run directly.
 * Prevents accidental execution when imported.
 */
if (require.main === module) {
  runSeeds().catch((err) => {
    log.error('Unhandled seed error', err);
    process.exit(1);
  });
}

export { runSeeds };
