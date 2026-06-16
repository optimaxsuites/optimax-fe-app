interface BaseMeta {
  id: number;
  name: string;
  des?: string;
}

export interface Country extends BaseMeta {}
export interface State extends BaseMeta {
  countryId: number;
}
export interface City extends BaseMeta {
  stateId: number;
}