export default function sanitizeName(name: string) {
  return name.replace(/[\r\n"\\/:*?<>|]/g, "_");
}
