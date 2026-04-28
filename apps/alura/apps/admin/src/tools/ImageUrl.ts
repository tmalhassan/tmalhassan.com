export default function ImageUrl(filename: string) {
    if (filename.startsWith('blob:')) return filename;
    else return `${import.meta.env.VITE_API_BASE_URL}/${filename}`;
}