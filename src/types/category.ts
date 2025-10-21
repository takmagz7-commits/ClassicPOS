export interface Category {
  id: string;
  name: string;
  isUncategorized?: boolean; // New: Flag to identify the 'Uncategorized' category
}