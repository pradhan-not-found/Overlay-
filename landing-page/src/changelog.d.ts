declare module 'virtual:changelog' {
  const entries: { date: string; title: string; points: string[] }[];
  export default entries;
}
