// Tipado de las variables definidas en .env
// Accesibles vía: import { API_URL } from '@env';
declare module '@env' {
  export const API_URL: string;
}
