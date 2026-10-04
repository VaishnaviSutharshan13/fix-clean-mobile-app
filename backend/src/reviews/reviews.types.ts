export interface ReviewView {
  id: string;
  rating: number;
  comment: string;
  // Shortened for privacy, e.g. "K. Perera".
  customerName: string;
  createdAt: Date;
}

export interface ReviewListView {
  items: ReviewView[];
  total: number;
}
