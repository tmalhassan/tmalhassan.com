export type ContentBlock =
{
  type: "paragraph";
  content: string;
}
| {
  type: "heading1";
  content: string;
}
| {
  type: "heading2";
  content: string;
}
| {
  type: "heading3";
  content: string;
}
| {
  type: "ulist";
  content: string[];
}
| {
  type: "olist";
  content: string[];
};