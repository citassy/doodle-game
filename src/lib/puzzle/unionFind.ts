/**
 * Disjoint-set over piece indexes. The root of every group is its lowest piece
 * index, so a cluster id is stable and can be stored as-is.
 */
export class UnionFind {
  private parent: Int32Array;
  private size: Int32Array;
  private groups: number;

  constructor(n: number) {
    this.parent = new Int32Array(n);
    this.size = new Int32Array(n).fill(1);
    for (let i = 0; i < n; i++) this.parent[i] = i;
    this.groups = n;
  }

  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[i] !== root) {
      const next = this.parent[i];
      this.parent[i] = root;
      i = next;
    }
    return root;
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    const [keep, drop] = ra < rb ? [ra, rb] : [rb, ra];
    this.parent[drop] = keep;
    this.size[keep] += this.size[drop];
    this.groups--;
    return true;
  }

  same(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  sizeOf(i: number): number {
    return this.size[this.find(i)];
  }

  get count(): number {
    return this.groups;
  }

  get length(): number {
    return this.parent.length;
  }

  /** Map of root -> member indexes. */
  clusters(): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const r = this.find(i);
      const arr = map.get(r);
      if (arr) arr.push(i);
      else map.set(r, [i]);
    }
    return map;
  }

  membersOf(root: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.parent.length; i++) if (this.find(i) === root) out.push(i);
    return out;
  }
}
