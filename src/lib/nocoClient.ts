// NocoDB Client Adapter providing a fluent query interface compatible with the application's needs
// This replaces Supabase table operations seamlessly.

export const NOCO_URL = process.env.NEXT_PUBLIC_NOCO_URL || 'https://evolution-nocodb.5rqumh.easypanel.host';
export const NOCO_TOKEN = process.env.NOCO_TOKEN || 'C2l41lZPrFvg6UrzEpB6bwe0tD5bLMFWeuWjAlZD';
export const NOCO_PROJECT_ID = process.env.NOCO_PROJECT_ID || 'pye51jpoz8rz1u1';

export const NOCO_TABLES: Record<string, string> = {
  configuracoes_gerais: 'mb9blwuxvi66e77',
  token_facebook_juan: 'm3tt153iiwox599',
  usuarios: 'mvc06f44zhq083m',
  controle_relatorio_melina: 'mzfqwsqjk0deqcd',
  clientes: 'mleia5r89rshard',
  VeiculoOperador: 'moxj2chtu2a8vnn',
  publicacoes_design_online: 'mtc6a82skexkshd',
  clientes_vendidos: 'mh73teknszw0nfh',
  design_online_layouts_clientes: 'm9rwvi14in3v8i3',
  design_online_layouts_disparos: 'mpx1lfm8jylzo1f',
  design_online_stories_veiculos: 'mo37qmn7r4z9ot0'
};

export class NocoQueryBuilder<T = any> {
  private tableName: string;
  private tableId: string;
  private filters: string[] = [];
  private sortFields: string[] = [];
  private fieldsToSelect?: string;
  private limitVal?: number;
  private offsetVal?: number;
  private countOnly: boolean = false;
  private isSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.tableId = NOCO_TABLES[tableName] || tableName;
  }

  select(fields?: string, options?: { count?: 'exact'; head?: boolean }) {
    if (fields && fields !== '*') {
      this.fieldsToSelect = fields.replace(/\s+/g, '');
    }
    if (options?.head || options?.count === 'exact') {
      if (options?.head) {
        this.limitVal = 1;
      }
    }
    return this;
  }

  eq(column: string, value: any) {
    if (value === null || value === undefined) {
      this.filters.push(`(${column},is,null)`);
    } else {
      this.filters.push(`(${column},eq,${String(value)})`);
    }
    return this;
  }

  neq(column: string, value: any) {
    if (value === null || value === undefined) {
      this.filters.push(`(${column},isnot,null)`);
    } else {
      this.filters.push(`(${column},neq,${String(value)})`);
    }
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push(`(${column},gt,${String(value)})`);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push(`(${column},ge,${String(value)})`);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push(`(${column},lt,${String(value)})`);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push(`(${column},le,${String(value)})`);
    return this;
  }

  like(column: string, pattern: string) {
    const val = pattern.replace(/%/g, '*');
    this.filters.push(`(${column},like,${val})`);
    return this;
  }

  ilike(column: string, pattern: string) {
    const val = pattern.replace(/%/g, '*');
    this.filters.push(`(${column},like,${val})`);
    return this;
  }

  is(column: string, value: null) {
    this.filters.push(`(${column},is,null)`);
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && (value === null || value === undefined)) {
      this.filters.push(`(${column},isnot,null)`);
    } else if (operator === 'ilike' || operator === 'like') {
      const val = String(value).replace(/%/g, '*');
      this.filters.push(`(${column},nlike,${val})`);
    } else if (operator === 'in') {
      this.filters.push(`(${column},nin,${Array.isArray(value) ? value.join(',') : String(value)})`);
    } else if (operator === 'eq') {
      this.filters.push(`(${column},neq,${String(value)})`);
    }
    return this;
  }

  in(column: string, values: any[]) {
    if (Array.isArray(values) && values.length > 0) {
      this.filters.push(`(${column},in,${values.join(',')})`);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const asc = options?.ascending !== false;
    this.sortFields.push(asc ? column : `-${column}`);
    return this;
  }

  limit(count: number) {
    this.limitVal = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  async executeQuery(): Promise<{ data: any[] | any; error: any; count?: number | null }> {
    try {
      const params = new URLSearchParams();
      if (this.filters.length > 0) {
        params.append('where', this.filters.join('~and'));
      }
      if (this.sortFields.length > 0) {
        params.append('sort', this.sortFields.join(','));
      }
      if (this.fieldsToSelect) {
        params.append('fields', this.fieldsToSelect);
      }
      params.append('limit', String(this.limitVal || 1000));
      if (this.offsetVal !== undefined) {
        params.append('offset', String(this.offsetVal));
      }

      const url = `${NOCO_URL}/api/v2/tables/${this.tableId}/records?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'xc-token': NOCO_TOKEN,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        const errText = await res.text();
        return { data: null, error: { message: errText }, count: 0 };
      }

      const json = await res.json();
      const list: any[] = json.list || [];
      const total = json.pageInfo?.totalRows ?? list.length;

      if (this.isSingle) {
        return { data: list[0] || null, error: null, count: total };
      }

      return { data: list, error: null, count: total };
    } catch (e: any) {
      return { data: null, error: { message: e.message }, count: 0 };
    }
  }

  then<TResult1 = { data: any; error: any; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled as any, onrejected as any);
  }

  // INSERT
  insert(values: any | any[]) {
    const parent = this;
    const records = Array.isArray(values) ? values : [values];

    const runInsert = async () => {
      try {
        const url = `${NOCO_URL}/api/v2/tables/${parent.tableId}/records`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'xc-token': NOCO_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(records)
        });

        if (!res.ok) {
          const errText = await res.text();
          return { data: null, error: { message: errText } };
        }

        const data = await res.json();
        return { data: data, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    };

    return {
      select: () => ({
        single: async () => {
          const res = await runInsert();
          return { data: res.data ? (res.data[0] || res.data) : null, error: res.error };
        },
        then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
          return runInsert().then(onfulfilled, onrejected);
        }
      }),
      then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
        return runInsert().then(onfulfilled, onrejected);
      }
    } as any;
  }

  // UPDATE
  update(updates: any) {
    const parent = this;

    const createUpdateExecution = () => {
      const execute = async () => {
        try {
          const { data: toUpdate } = await parent.executeQuery();
          const items = Array.isArray(toUpdate) ? toUpdate : (toUpdate ? [toUpdate] : []);
          if (items.length === 0) {
            return { data: [], error: null };
          }

          const patchPayload = items.map((item: any) => ({
            id: item.id || item.Id || item.email,
            ...updates
          }));

          const url = `${NOCO_URL}/api/v2/tables/${parent.tableId}/records`;
          const patchRes = await fetch(url, {
            method: 'PATCH',
            headers: {
              'xc-token': NOCO_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(patchPayload)
          });

          if (!patchRes.ok) {
            const errText = await patchRes.text();
            return { data: null, error: { message: errText } };
          }

          const resData = await patchRes.json();
          // NocoDB PATCH only returns [{ id: ... }]
          // In Supabase, update().select() returns full updated record data!
          // So let's re-query the updated items to return their full representation
          const updatedIds = Array.isArray(resData) ? resData.map((r: any) => r.id).filter(Boolean) : (resData?.id ? [resData.id] : []);
          let fullData = items.map((orig: any) => ({ ...orig, ...updates }));
          if (updatedIds.length > 0) {
            try {
              if (updatedIds.length === 1) {
                const getRes = await fetch(`${NOCO_URL}/api/v2/tables/${parent.tableId}/records/${encodeURIComponent(updatedIds[0])}`, {
                  headers: { 'xc-token': NOCO_TOKEN }
                });
                if (getRes.ok) {
                  const fetched = await getRes.json();
                  fullData = [fetched];
                }
              }
            } catch (_) {}
          }
          return { data: fullData, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      };

      return {
        select: () => ({
          single: async () => {
            const res = await execute();
            return { data: res.data ? (res.data[0] || res.data) : null, error: res.error };
          },
          then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
            return execute().then(onfulfilled, onrejected);
          }
        }),
        then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
          return execute().then(onfulfilled, onrejected);
        }
      } as any;
    };

    return {
      eq: (column: string, value: any) => {
        parent.eq(column, value);
        return createUpdateExecution();
      },
      neq: (column: string, value: any) => {
        parent.neq(column, value);
        return createUpdateExecution();
      },
      in: (column: string, values: any[]) => {
        parent.in(column, values);
        return createUpdateExecution();
      },
      ilike: (column: string, pattern: string) => {
        parent.ilike(column, pattern);
        return createUpdateExecution();
      },
      like: (column: string, pattern: string) => {
        parent.like(column, pattern);
        return createUpdateExecution();
      }
    } as any;
  }

  // DELETE
  delete() {
    const parent = this;
    const createDeleteExecution = () => ({
      then: async (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
        try {
          const { data: toDelete } = await parent.executeQuery();
          const items = Array.isArray(toDelete) ? toDelete : (toDelete ? [toDelete] : []);
          if (items.length === 0) {
            const res = { data: [], error: null };
            return onfulfilled ? onfulfilled(res) : res;
          }

          const deletePayload = items.map((item: any) => ({
            id: item.id || item.Id || item.email
          }));

          const url = `${NOCO_URL}/api/v2/tables/${parent.tableId}/records`;
          const delRes = await fetch(url, {
            method: 'DELETE',
            headers: {
              'xc-token': NOCO_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(deletePayload)
          });

          if (!delRes.ok) {
            const errText = await delRes.text();
            const res = { data: null, error: { message: errText } };
            return onfulfilled ? onfulfilled(res) : res;
          }

          const res = { data: true, error: null };
          return onfulfilled ? onfulfilled(res) : res;
        } catch (err: any) {
          const res = { data: null, error: { message: err.message } };
          return onrejected ? onrejected(res) : (onfulfilled ? onfulfilled(res) : res);
        }
      }
    });

    return {
      eq: (column: string, value: any) => {
        parent.eq(column, value);
        return createDeleteExecution();
      },
      neq: (column: string, value: any) => {
        parent.neq(column, value);
        return createDeleteExecution();
      },
      in: (column: string, values: any[]) => {
        parent.in(column, values);
        return createDeleteExecution();
      },
      ilike: (column: string, pattern: string) => {
        parent.ilike(column, pattern);
        return createDeleteExecution();
      },
      like: (column: string, pattern: string) => {
        parent.like(column, pattern);
        return createDeleteExecution();
      }
    } as any;
  }
}

export const nocoClient = {
  from(tableName: string) {
    return new NocoQueryBuilder(tableName);
  }
};
