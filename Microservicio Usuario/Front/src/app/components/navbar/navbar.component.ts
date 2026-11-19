import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  router = inject(Router);

  msStatus: 'UP' | 'DOWN' | 'CHECKING' = 'CHECKING';

  ngOnInit(): void {
    this.verificarSalud();
  }

  verificarSalud(): void {
    this.api.checkHealth().subscribe({
      next: (res) => {
        this.msStatus = res.status === 'UP' ? 'UP' : 'DOWN';
      },
      error: () => {
        this.msStatus = 'DOWN';
      }
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
