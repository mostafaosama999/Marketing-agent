// Types for manual inbound marketing KPIs

export interface InboundKPIData {
  month: string;              // "2025-11" format (YYYY-MM)
  monthLabel?: string;        // "Nov 2025" for display

  // Quality ratings (1-10)
  websiteQuality?: number;
  linkedInQuality?: number;

  // Content metrics
  impressions?: number;
  posts?: number;
  followers?: number;

  // Metadata
  updatedAt?: Date;
  updatedBy?: string;
  createdAt?: Date;
  createdBy?: string;
}

// Form data for the dialog
export interface InboundKPIFormData {
  websiteQuality: number | '';
  linkedInQuality: number | '';
  impressions: number | '';
  posts: number | '';
  followers: number | '';
}
