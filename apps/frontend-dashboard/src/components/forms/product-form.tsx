"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  Input,
  TextArea,
  Select,
  FormRow,
  FormActions,
} from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import {
  Product,
  CreateProductInput,
  createProduct,
  updateProduct,
} from "@/lib/hooks";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null; // null = create, Product = edit
  organizationId: string;
}

const categoryOptions = [
  { value: "CANNABIS", label: "Cannabis" },
  { value: "HEMP_CBD", label: "Hemp / CBD" },
  { value: "SUPPLEMENT", label: "Supplement" },
  { value: "PHARMA", label: "Pharmaceutical" },
  { value: "PEPTIDE", label: "Peptide" },
];

const strainTypeOptions = [
  { value: "", label: "Select strain type" },
  { value: "INDICA", label: "Indica" },
  { value: "SATIVA", label: "Sativa" },
  { value: "HYBRID", label: "Hybrid" },
];

export function ProductForm({
  isOpen,
  onClose,
  onSuccess,
  product,
  organizationId,
}: ProductFormProps) {
  const isEditing = !!product;

  const [formData, setFormData] = useState<CreateProductInput>({
    name: product?.name || "",
    sku: product?.sku || "",
    description: product?.description || "",
    category: product?.category || "SUPPLEMENT",
    organizationId: product?.organizationId || organizationId,
    price: product?.price || 0,
    quantity: product?.quantity || 0,
    thcContent: product?.thcContent,
    cbdContent: product?.cbdContent,
    strainType: product?.strainType || "",
    batchNumber: product?.batchNumber || "",
    harvestDate: product?.harvestDate?.split("T")[0] || "",
    expirationDate: product?.expirationDate?.split("T")[0] || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }
    if (!formData.sku.trim()) {
      newErrors.sku = "SKU is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (formData.price === undefined || formData.price < 0) {
      newErrors.price = "Price is required and must be positive";
    }

    // Category-specific validations
    if (
      formData.category === "CANNABIS" ||
      formData.category === "HEMP_CBD"
    ) {
      if (formData.thcContent !== undefined && formData.thcContent < 0) {
        newErrors.thcContent = "THC content cannot be negative";
      }
      if (formData.cbdContent !== undefined && formData.cbdContent < 0) {
        newErrors.cbdContent = "CBD content cannot be negative";
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
      // Build the product data with required fields
      const productData: CreateProductInput = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category,
        price: formData.price ?? 0,
      };
      
      // Add organizationId if available
      if (formData.organizationId) {
        productData.organizationId = formData.organizationId;
      }
      
      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        productData.description = formData.description.trim();
      }
      if (formData.quantity !== undefined && formData.quantity > 0) {
        productData.quantity = formData.quantity;
      }
      if (formData.batchNumber?.trim()) {
        productData.batchNumber = formData.batchNumber.trim();
      }
      if (formData.strainType && formData.strainType !== "") {
        productData.strainType = formData.strainType;
      }
      if (formData.thcContent !== undefined && formData.thcContent > 0) {
        productData.thcContent = formData.thcContent;
      }
      if (formData.cbdContent !== undefined && formData.cbdContent > 0) {
        productData.cbdContent = formData.cbdContent;
      }
      if (formData.harvestDate && formData.harvestDate !== "") {
        productData.harvestDate = formData.harvestDate;
      }
      if (formData.expirationDate && formData.expirationDate !== "") {
        productData.expirationDate = formData.expirationDate;
      }
      
      if (isEditing && product) {
        await updateProduct(product._id, productData);
      } else {
        await createProduct(productData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Failed to save product",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCannabisFields =
    formData.category === "CANNABIS" || formData.category === "HEMP_CBD";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Product" : "Create Product"}
      description={
        isEditing
          ? "Update product information"
          : "Add a new product to your catalog"
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-4 bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 rounded-lg text-error-600 dark:text-error-500 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-[var(--border)] pb-2">
            Basic Information
          </h3>
          <FormRow>
            <Input
              name="name"
              label="Product Name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              placeholder="Enter product name"
            />
            <Input
              name="sku"
              label="SKU"
              value={formData.sku}
              onChange={handleChange}
              error={errors.sku}
              required
              placeholder="e.g., PRD-001"
            />
          </FormRow>

          <TextArea
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your product..."
            rows={3}
          />

          <FormRow>
            <Select
              name="category"
              label="Category"
              value={formData.category}
              onChange={handleChange}
              error={errors.category}
              options={categoryOptions}
              required
            />
            <Input
              name="batchNumber"
              label="Batch Number"
              value={formData.batchNumber}
              onChange={handleChange}
              placeholder="e.g., BATCH-2024-001"
            />
          </FormRow>

          <FormRow>
            <Input
              name="price"
              label="Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price ?? ""}
              onChange={handleNumberChange}
              error={errors.price}
              required
              placeholder="0.00"
            />
            <Input
              name="quantity"
              label="Quantity"
              type="number"
              min="0"
              value={formData.quantity ?? ""}
              onChange={handleNumberChange}
              placeholder="0"
            />
          </FormRow>
        </div>

        {/* Cannabis-specific fields */}
        {showCannabisFields && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-[var(--border)] pb-2">
              Cannabis Details
            </h3>
            <FormRow cols={3}>
              <Input
                name="thcContent"
                label="THC Content (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.thcContent ?? ""}
                onChange={handleNumberChange}
                error={errors.thcContent}
                placeholder="0.00"
              />
              <Input
                name="cbdContent"
                label="CBD Content (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.cbdContent ?? ""}
                onChange={handleNumberChange}
                error={errors.cbdContent}
                placeholder="0.00"
              />
              <Select
                name="strainType"
                label="Strain Type"
                value={formData.strainType}
                onChange={handleChange}
                options={strainTypeOptions}
              />
            </FormRow>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider border-b border-[var(--border)] pb-2">
            Dates
          </h3>
          <FormRow>
            <Input
              name="harvestDate"
              label="Harvest / Manufacture Date"
              type="date"
              value={formData.harvestDate}
              onChange={handleChange}
            />
            <Input
              name="expirationDate"
              label="Expiration Date"
              type="date"
              value={formData.expirationDate}
              onChange={handleChange}
            />
          </FormRow>
        </div>

        <FormActions>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? (
              <>
                <Icons.loader size={16} className="mr-2 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : isEditing ? (
              "Update Product"
            ) : (
              "Create Product"
            )}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
