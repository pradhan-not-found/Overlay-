declare module 'virtual:changelog' {
  const entries: { date: string; title: string; points: string[]; version: string; size: 'launch' | 'big' | 'small'; count: number }[];
  export default entries;
}
