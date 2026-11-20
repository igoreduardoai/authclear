declare module "text-readability" {
  interface ReadabilityApi {
    fleschKincaidGrade(text: string): number;
  }
  const readability: ReadabilityApi;
  export default readability;
}
