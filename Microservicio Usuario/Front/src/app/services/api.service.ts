import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Health
  checkHealth(): Observable<any> {
    return this.http.get('/health');
  }

  // Auth
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials);
  }

  register(data: { email: string; password: string; nombre: string; apellido: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  changePassword(data: { passwordActual: string; passwordNueva: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/change-password`, data, { headers: this.getHeaders() });
  }

  // Onboarding
  completarPerfilBiometrico(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/onboarding/perfil-biometrico`, data, { headers: this.getHeaders() });
  }

  completarFichaPARQ(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/onboarding/ficha-medica`, data, { headers: this.getHeaders() });
  }

  completarPreferencias(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/onboarding/preferencias`, data, { headers: this.getHeaders() });
  }

  getOnboardingStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/onboarding/status`, { headers: this.getHeaders() });
  }

  // Cliente
  getMiPerfil(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/mi-perfil`, { headers: this.getHeaders() });
  }

  updateMiPerfil(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/clientes/mi-perfil`, data, { headers: this.getHeaders() });
  }

  getMiProgreso(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/mi-progreso`, { headers: this.getHeaders() });
  }

  getMiCarnet(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/mi-carnet`, { headers: this.getHeaders() });
  }

  getMisMetas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/mis-metas`, { headers: this.getHeaders() });
  }

  crearMeta(meta: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clientes/mis-metas`, meta, { headers: this.getHeaders() });
  }

  actualizarMeta(metaId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/clientes/mis-metas/${metaId}`, data, { headers: this.getHeaders() });
  }

  eliminarMeta(metaId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/clientes/mis-metas/${metaId}`, { headers: this.getHeaders() });
  }

  calcularTDEE(params: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clientes/calculadora-tdee`, params, { headers: this.getHeaders() });
  }

  getMisSesiones(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/mis-sesiones`, { headers: this.getHeaders() });
  }

  revocarSesion(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/clientes/mis-sesiones/${id}`, { headers: this.getHeaders() });
  }

  // Entrenador
  getClientes(search?: string, objetivo?: string): Observable<any> {
    let url = `${this.baseUrl}/entrenador/clientes?limit=50`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (objetivo) url += `&objetivo=${encodeURIComponent(objetivo)}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  getClienteDetalle(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/entrenador/clientes/${id}`, { headers: this.getHeaders() });
  }

  registrarMedicion(id: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/entrenador/clientes/${id}/mediciones`, data, { headers: this.getHeaders() });
  }

  agregarObservacion(id: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/entrenador/clientes/${id}/observaciones`, data, { headers: this.getHeaders() });
  }

  cambiarObjetivo(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/entrenador/clientes/${id}/objetivo`, data, { headers: this.getHeaders() });
  }

  // Admin
  getUsuarios(search?: string, rol?: string): Observable<any> {
    let url = `${this.baseUrl}/admin/usuarios?limit=50`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (rol) url += `&rol=${encodeURIComponent(rol)}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  crearStaff(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/usuarios`, data, { headers: this.getHeaders() });
  }

  editarUsuario(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/usuarios/${id}`, data, { headers: this.getHeaders() });
  }

  desactivarUsuario(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/usuarios/${id}`, { headers: this.getHeaders() });
  }

  getEstadisticas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/estadisticas`, { headers: this.getHeaders() });
  }

  getAuditoria(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/auditoria?limit=30`, { headers: this.getHeaders() });
  }
}
