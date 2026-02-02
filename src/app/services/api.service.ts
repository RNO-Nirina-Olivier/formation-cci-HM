import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log(' API Base URL:', this.baseUrl);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  get<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    console.log(` GET: ${url}`);
    return this.http
      .get<T>(url, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    console.log(` POST: ${url}`, data);
    return this.http
      .post<T>(url, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    console.log(` PUT: ${url}`, data);
    return this.http
      .put<T>(url, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    console.log(` DELETE: ${url}`);
    return this.http
      .delete<T>(url, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error(' Erreur API:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error,
    });

    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage =
          'Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré.';
      } else if (error.status === 404) {
        errorMessage = `Endpoint non trouvé: ${error.url}`;
      } else if (error.status === 500) {
        errorMessage = `Erreur serveur interne: ${
          error.error?.message || error.message
        }`;
      } else {
        errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
