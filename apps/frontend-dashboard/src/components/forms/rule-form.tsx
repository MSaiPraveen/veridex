'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input, TextArea, Select, FormRow, FormActions } from '@/components/ui/form';
import { ComplianceRule, CreateRuleInput } from '@/lib/hooks';

interface RuleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRuleInput) => Promise<void>;
  rule?: ComplianceRule;
}

const CATEGORIES = [
  { value: 'CANNABIS', label: 'Cannabis' },
  { value: 'HEMP_CBD', label: 'Hemp/CBD' },
  { value: 'SUPPLEMENT', label: 'Supplement' },
  { value: 'PHARMA', label: 'Pharmaceutical' },
  { value: 'PEPTIDE', label: 'Peptide' },
];

const SEVERITIES = [
  { value: 'BLOCKER', label: 'Blocker (Fails compliance)' },
  { value: 'WARNING', label: 'Warning (Requires review)' },
];

const CONDITION_TEMPLATES = [
  {
    value: 'thc_limit',
    label: 'THC Content Limit',
    condition: { '<=': [{ var: 'product.thcContent' }, 0.3] },
    description: 'Verify THC content is below threshold',
  },
  {
    value: 'cbd_required',
    label: 'CBD Content Required',
    condition: { '>': [{ var: 'product.cbdContent' }, 0] },
    description: 'Ensure CBD content is present',
  },
  {
    value: 'has_lab_report',
    label: 'Lab Report Required',
    condition: { some: [{ var: 'documents' }, { '===': [{ var: '.type' }, 'LAB_REPORT'] }] },
    description: 'Require at least one lab report document',
  },
  {
    value: 'has_coa',
    label: 'Certificate of Analysis Required',
    condition: { some: [{ var: 'documents' }, { '===': [{ var: '.type' }, 'COA'] }] },
    description: 'Require Certificate of Analysis',
  },
  {
    value: 'valid_license',
    label: 'Valid License Required',
    condition: { some: [{ var: 'documents' }, { and: [{ '===': [{ var: '.type' }, 'LICENSE'] }, { '===': [{ var: '.status' }, 'SUCCESS'] }] }] },
    description: 'Require valid active license document',
  },
  {
    value: 'batch_tracking',
    label: 'Batch Tracking Required',
    condition: { and: [{ '!!': { var: 'product.batchNumber' } }, { '!!': { var: 'product.lotNumber' } }] },
    description: 'Require batch and lot number tracking',
  },
  {
    value: 'expiry_date',
    label: 'Valid Expiry Date',
    condition: { '>': [{ var: 'product.expiresAt' }, { now: [] }] },
    description: 'Product must not be expired',
  },
  {
    value: 'custom',
    label: 'Custom Condition (JSON)',
    condition: {},
    description: 'Define your own JSON Logic condition',
  },
];

const REASON_CODES = [
  { value: 'THC_LIMIT_EXCEEDED', label: 'THC Limit Exceeded' },
  { value: 'MISSING_DOCUMENT', label: 'Missing Document' },
  { value: 'DOCUMENT_EXPIRED', label: 'Document Expired' },
  { value: 'PRODUCT_EXPIRED', label: 'Product Expired' },
  { value: 'MISSING_TRACKING', label: 'Missing Tracking Info' },
  { value: 'LICENSE_INVALID', label: 'License Invalid' },
  { value: 'COMPLIANCE_CHECK_FAILED', label: 'Compliance Check Failed' },
  { value: 'CUSTOM', label: 'Custom Reason' },
];

export function RuleForm({ isOpen, onClose, onSubmit, rule }: RuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [ruleId, setRuleId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplianceRule['category']>('CANNABIS');
  const [severity, setSeverity] = useState<ComplianceRule['severity']>('BLOCKER');
  const [conditionTemplate, setConditionTemplate] = useState('thc_limit');
  const [customCondition, setCustomCondition] = useState('');
  const [reasonCode, setReasonCode] = useState('COMPLIANCE_CHECK_FAILED');
  const [failureMessage, setFailureMessage] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [source, setSource] = useState('');

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
       
      setRuleId(rule.ruleId);
       
      setName(rule.name);
       
      setDescription(rule.description);
       
      setCategory(rule.category);
       
      setSeverity(rule.severity);
       
      setConditionTemplate('custom');
       
      setCustomCondition(JSON.stringify(rule.condition, null, 2));
       
      setReasonCode(rule.failure.reasonCode || 'CUSTOM');
       
      setFailureMessage(rule.failure.message);
       
      setJurisdiction(rule.metadata?.jurisdiction || '');
       
      setSource(rule.metadata?.source || '');
    } else {
       
      setRuleId('');
       
      setName('');
       
      setDescription('');
       
      setCategory('CANNABIS');
       
      setSeverity('BLOCKER');
       
      setConditionTemplate('thc_limit');
       
      setCustomCondition('');
       
      setReasonCode('COMPLIANCE_CHECK_FAILED');
       
      setFailureMessage('');
       
      setJurisdiction('');
       
      setSource('');
    }
     
    setErrors({});
  }, [rule, isOpen]);

  // Auto-generate rule ID from name
  useEffect(() => {
    if (!rule && name && !ruleId) {
      const generatedId = name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 30);
       
      setRuleId(generatedId);
    }
  }, [name, rule, ruleId]);

  // Auto-fill failure message from template
  useEffect(() => {
    if (conditionTemplate !== 'custom' && !failureMessage) {
      const template = CONDITION_TEMPLATES.find(t => t.value === conditionTemplate);
      if (template) {
         
        setFailureMessage(template.description);
      }
    }
  }, [conditionTemplate, failureMessage]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!ruleId.trim()) newErrors.ruleId = 'Rule ID is required';
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!failureMessage.trim()) newErrors.failureMessage = 'Failure message is required';

    if (conditionTemplate === 'custom') {
      if (!customCondition.trim()) {
        newErrors.customCondition = 'Condition JSON is required';
      } else {
        try {
          JSON.parse(customCondition);
        } catch {
          newErrors.customCondition = 'Invalid JSON format';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let condition: Record<string, unknown>;
      if (conditionTemplate === 'custom') {
        condition = JSON.parse(customCondition);
      } else {
        condition = CONDITION_TEMPLATES.find(t => t.value === conditionTemplate)?.condition || {};
      }

      const data: CreateRuleInput = {
        ruleId: ruleId.trim(),
        name: name.trim(),
        description: description.trim(),
        category,
        severity,
        condition,
        failure: {
          status: severity === 'BLOCKER' ? 'NON_COMPLIANT' : 'REQUIRES_REVIEW',
          reasonCode: reasonCode === 'CUSTOM' ? ruleId.toUpperCase() : reasonCode,
          message: failureMessage.trim(),
        },
        metadata: {
          ...(jurisdiction && { jurisdiction }),
          ...(source && { source }),
        },
      };

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = CONDITION_TEMPLATES.find(t => t.value === conditionTemplate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? 'Edit Compliance Rule' : 'Create Compliance Rule'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--foreground)] border-b border-[var(--border)] pb-2">
            Basic Information
          </h4>

          <FormRow cols={2}>
            <Input
              label="Rule ID"
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g., THC_LIMIT_CHECK"
              error={errors.ruleId}
              hint="Unique identifier (auto-generated from name)"
              required
            />
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplianceRule['category'])}
              options={CATEGORIES}
              required
            />
          </FormRow>

          <Input
            label="Rule Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., THC Content Compliance Check"
            error={errors.name}
            required
          />

          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this rule validates..."
            rows={2}
            error={errors.description}
            required
          />

          <Select
            label="Severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as ComplianceRule['severity'])}
            options={SEVERITIES}
            hint="BLOCKER fails compliance; WARNING requires manual review"
            required
          />
        </div>

        {/* Condition */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--foreground)] border-b border-[var(--border)] pb-2">
            Rule Condition
          </h4>

          <Select
            label="Condition Template"
            value={conditionTemplate}
            onChange={(e) => {
              setConditionTemplate(e.target.value);
              if (e.target.value !== 'custom') {
                const template = CONDITION_TEMPLATES.find(t => t.value === e.target.value);
                setCustomCondition(JSON.stringify(template?.condition, null, 2));
              }
            }}
            options={CONDITION_TEMPLATES.map(t => ({ value: t.value, label: t.label }))}
            hint={selectedTemplate?.description}
          />

          {conditionTemplate === 'custom' && (
            <TextArea
              label="Condition JSON (JSON Logic)"
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              placeholder='{ "<=": [{ "var": "product.thcContent" }, 0.3] }'
              rows={5}
              error={errors.customCondition}
              hint="Define rule logic using JSON Logic format"
              className="font-mono text-sm"
            />
          )}

          {conditionTemplate !== 'custom' && (
            <div className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--foreground-muted)] mb-2">Generated Condition:</p>
              <pre className="text-xs text-[var(--foreground)] overflow-x-auto font-mono">
                {JSON.stringify(selectedTemplate?.condition, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Failure Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--foreground)] border-b border-[var(--border)] pb-2">
            Failure Configuration
          </h4>

          <Select
            label="Reason Code"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            options={REASON_CODES}
            hint="Code used for categorizing failures"
          />

          <TextArea
            label="Failure Message"
            value={failureMessage}
            onChange={(e) => setFailureMessage(e.target.value)}
            placeholder="Message shown when rule fails..."
            rows={2}
            error={errors.failureMessage}
            required
          />
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--foreground)] border-b border-[var(--border)] pb-2">
            Additional Metadata
            <span className="text-xs font-normal text-[var(--foreground-muted)] ml-2">(Optional)</span>
          </h4>

          <FormRow cols={2}>
            <Input
              label="Jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g., US-CA, EU, FEDERAL"
              hint="Geographic scope of the rule"
            />
            <Input
              label="Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., FDA 21 CFR Part 1308"
              hint="Reference to source regulation"
            />
          </FormRow>
        </div>

        <FormActions
          onCancel={onClose}
          submitLabel={rule ? 'Update Rule' : 'Create Rule'}
          isSubmitting={isSubmitting}
        />
      </form>
    </Modal>
  );
}
