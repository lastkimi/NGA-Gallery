export interface Object {
  id: number;
  object_id: string;
  accession_number: string;
  title: string;
  title_zh?: string;
  display_date: string;
  display_date_zh?: string;
  begin_year: number | null;
  end_year: number | null;
  timespan: string;
  medium: string;
  medium_zh?: string;
  dimensions: string;
  dimensions_zh?: string;
  attribution_inverted: string;
  attribution_inverted_zh?: string;
  attribution: string;
  attribution_zh?: string;
  provenance: string;
  provenance_zh?: string;
  credit_line: string;
  credit_line_zh?: string;
  classification: string;
  classification_zh?: string;
  sub_classification: string;
  sub_classification_zh?: string;
  visual_classification: string;
  visual_classification_zh?: string;
  department: string;
  department_zh?: string;
  wikidata_id: string;
  custom_print_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface Constituent {
  id: number;
  constituent_id: string;
  ulan_id: string;
  preferred_name: string;
  preferred_name_zh?: string;
  forward_name: string;
  last_name: string;
  display_date: string;
  is_artist: boolean;
  begin_year: number | null;
  end_year: number | null;
  nationality: string;
  nationality_zh?: string;
  visual_nationality: string;
  constituent_type: string;
  wikidata_id: string;
  created_at: Date;
}

export interface Image {
  id: number;
  uuid: string;
  object_id: number;
  iiif_url: string;
  iiif_thumb_url: string;
  view_type: string;
  sequence: number;
  width: number;
  height: number;
  max_pixels: number;
  full_path: string;
  thumb_path: string;
  preview_path: string;
  assistive_text: string;
  assistive_text_zh?: string;
  created_at: Date;
}

export interface ObjectWithDetails extends Object {
  images: Image[];
  constituents: Constituent[];
}
