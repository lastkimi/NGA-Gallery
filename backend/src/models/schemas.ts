import mongoose, { Schema, Document } from 'mongoose';

export interface IImage {
  uuid: string;
  iiif_url: string;
  iiif_thumb_url: string;
  view_type: string;
  sequence: number;
  width: number;
  height: number;
  max_pixels: number;
  assistive_text: string;
  assistive_text_zh?: string;
}

export interface ITranslation {
  locale: string;
  title: string;
  attribution: string;
  medium: string;
  provenance: string;
  credit_line: string;
  display_date: string;
}

export interface IObject extends Document {
  object_id: string;
  accession_number: string;
  title: string;
  title_zh?: string;
  display_date: string;
  display_date_zh?: string;
  begin_year: number;
  end_year: number;
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
  images: IImage[];
  translations: ITranslation[];
  created_at: Date;
  updated_at: Date;
}

export interface IConstituent extends Document {
  constituent_id: string;
  ulan_id: string;
  preferred_name: string;
  preferred_name_zh?: string;
  forward_name: string;
  last_name: string;
  display_date: string;
  is_artist: boolean;
  begin_year: number;
  end_year: number;
  nationality: string;
  nationality_zh?: string;
  visual_nationality: string;
  constituent_type: string;
  wikidata_id: string;
  created_at: Date;
}

const ImageSchema = new Schema({
  uuid: { type: String, required: true },
  iiif_url: String,
  iiif_thumb_url: String,
  view_type: String,
  sequence: Number,
  width: Number,
  height: Number,
  max_pixels: Number,
  assistive_text: String,
  assistive_text_zh: String,
});

const TranslationSchema = new Schema({
  locale: { type: String, required: true },
  title: String,
  attribution: String,
  medium: String,
  provenance: String,
  credit_line: String,
  display_date: String,
});

const ObjectSchema = new Schema({
  object_id: { type: String, required: true, unique: true },
  accession_number: String,
  title: { type: String, index: true },
  title_zh: { type: String, index: true },
  display_date: String,
  display_date_zh: String,
  begin_year: { type: Number, index: true },
  end_year: { type: Number, index: true },
  timespan: String,
  medium: String,
  medium_zh: String,
  dimensions: String,
  dimensions_zh: String,
  attribution_inverted: String,
  attribution_inverted_zh: String,
  attribution: { type: String, index: true },
  attribution_zh: { type: String, index: true },
  provenance: String,
  provenance_zh: String,
  credit_line: String,
  credit_line_zh: String,
  classification: { type: String, index: true },
  classification_zh: String,
  sub_classification: String,
  sub_classification_zh: String,
  visual_classification: String,
  visual_classification_zh: String,
  department: { type: String, index: true },
  department_zh: String,
  wikidata_id: String,
  custom_print_url: String,
  images: [ImageSchema],
  translations: [TranslationSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Text index for search
ObjectSchema.index(
  { 
    title: 'text', 
    attribution: 'text', 
    medium: 'text',
    title_zh: 'text',
    attribution_zh: 'text',
    medium_zh: 'text'
  },
  { 
    weights: { 
      title: 10, 
      title_zh: 10,
      attribution: 5, 
      attribution_zh: 5,
      medium: 1,
      medium_zh: 1
    } 
  }
);

const ConstituentSchema = new Schema({
  constituent_id: { type: String, required: true, unique: true },
  ulan_id: String,
  preferred_name: String,
  preferred_name_zh: String,
  forward_name: String,
  last_name: String,
  display_date: String,
  is_artist: Boolean,
  begin_year: Number,
  end_year: Number,
  nationality: String,
  nationality_zh: String,
  visual_nationality: String,
  constituent_type: String,
  wikidata_id: String,
  created_at: { type: Date, default: Date.now },
});

export const ObjectModel = mongoose.model<IObject>('Object', ObjectSchema);
export const ConstituentModel = mongoose.model<IConstituent>('Constituent', ConstituentSchema);
