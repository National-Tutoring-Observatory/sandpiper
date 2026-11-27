export default function getVersionParam(param: string | undefined): number {
  const version = Number(param);
  if (!Number.isInteger(version) || version < 1) {
    throw { statusCode: 404, message: "Codebook version not found" };
  }
  return version;
}
