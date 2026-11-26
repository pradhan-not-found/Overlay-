declare module 'virtual:changelog' {
  const entries: { date: string; title: string; points: string[]; version: string }[];
  export default entries;
}
