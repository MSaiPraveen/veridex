'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input, Select, FormRow, FormActions } from '@/components/ui/form';
import { Organization, CreateOrganizationInput } from '@/lib/hooks';

interface OrganizationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateOrganizationInput) => Promise<void>;
  organization?: Organization;
}

const ORGANIZATION_TYPES = [
  { value: 'MANUFACTURER', label: 'Manufacturer' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'IMPORTER', label: 'Importer' },
  { value: 'EXPORTER', label: 'Exporter' },
  { value: 'LABORATORY', label: 'Laboratory' },
];

export function OrganizationForm({ isOpen, onClose, onSubmit, organization }: OrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<Organization['type']>('MANUFACTURER');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
       
      setName(organization.name);
       
      setType(organization.type);
       
      setContactEmail(organization.contactEmail);
       
      setPhone(organization.phone || '');
       
      setStreet(organization.address?.street || '');
       
      setCity(organization.address?.city || '');
       
      setState(organization.address?.state || '');
       
      setZipCode(organization.address?.zipCode || '');
       
      setCountry(organization.address?.country || '');
    } else {
       
      setName('');
       
      setType('MANUFACTURER');
       
      setContactEmail('');
       
      setPhone('');
       
      setStreet('');
       
      setCity('');
       
      setState('');
       
      setZipCode('');
       
      setCountry('');
    }
     
    setErrors({});
  }, [organization, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Organization name is required';
    if (!contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const address = {
        ...(street && { street }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(country && { country }),
      };

      const data: CreateOrganizationInput = {
        name: name.trim(),
        type,
        contactEmail: contactEmail.trim(),
        ...(phone && { phone: phone.trim() }),
        ...(Object.keys(address).length > 0 && { address }),
      };

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={organization ? 'Edit Organization' : 'Add Organization'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--foreground)] border-b border-[var(--border)] pb-2">
            Organization Details
          </h4>

          <Input
            label="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Acme Cannabis Inc."
            error={errors.name}
            required
          />

          <FormRow cols={2}>
            <Select
              label="Organization Type"
              value={type}
              onChange={(e) => setType(e.target.value as Organization['type'])}
              options={ORGANIZATION_TYPES}
              required
            />
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </FormRow>

          <Input
            label="Contact Email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@company.com"
            error={errors.contactEmail}
            required
          />
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--foreground)] border-b border-[var(--border)] pb-2">
            Address
            <span className="text-xs font-normal text-[var(--foreground-muted)] ml-2">(Optional)</span>
          </h4>

          <Input
            label="Street Address"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main Street, Suite 100"
          />

          <FormRow cols={2}>
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Francisco"
            />
            <Input
              label="State/Province"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="CA"
            />
          </FormRow>

          <FormRow cols={2}>
            <Input
              label="ZIP/Postal Code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="94102"
            />
            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
            />
          </FormRow>
        </div>

        <FormActions
          onCancel={onClose}
          submitLabel={organization ? 'Update Organization' : 'Add Organization'}
          isSubmitting={isSubmitting}
        />
      </form>
    </Modal>
  );
}
