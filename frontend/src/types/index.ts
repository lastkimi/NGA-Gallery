export interface Object {
  id: number;
  object_id: string;
  accession_number: string;
  title: string;
  display_date: string;
  begin_year: number | null;
  end_year: number | null;
  timespan: string;
  medium: string;
  dimensions: string;
  attribution_inverted: string;
  attribution: string;
  provenance: string;
  credit_line: string;
  classification: string;
  sub_classification: string;
  visual_classification: string;
  department: string;
  wikidata_id: string;
  custom_print_url: string;
  images?: Image[];
  constituents?: Constituent[];
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
}

export interface Constituent {
  id: number;
  constituent_id: string;
  ulan_id: string;
  preferred_name: string;
  forward_name: string;
  last_name: string;
  display_date: string;
  is_artist: boolean;
  begin_year: number | null;
  end_year: number | null;
  nationality: string;
  visual_nationality: string;
  constituent_type: string;
  wikidata_id: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ObjectListResponse {
  data: Object[];
  pagination: Pagination;
}

export interface FilterOptions {
  search: string;
  classification: string;
  department: string;
  artist: string;
  beginYear: number | null;
  endYear: number | null;
  medium: string;
}

export interface Statistics {
  totalObjects: number;
  totalImages: number;
  totalArtists: number;
}

export interface TimelineData {
  period: string;
  count: number;
  startYear: number;
}

export interface NetworkNode {
  id: string;
  name: string;
  nationality: string;
  workCount: number;
  group: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  value: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}
