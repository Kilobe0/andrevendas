# André Valença — Monorepo

Galeria de arte contemporânea com e-commerce completo.

## Estrutura

```
andrevendas/
├── backend/   # NestJS + MongoDB Atlas
└── frontend/  # Next.js 15
```

## Como rodar

### Backend (porta 3001)
```bash
cd backend
npm run start:dev
```

### Frontend (porta 3000)
```bash
cd frontend
npm run dev
```

## Acesso

| Serviço | URL |
|---|---|
| Site | http://localhost:3000 |
| API | http://localhost:3001 |
| Admin | http://localhost:3000/admin/login |

## Credenciais Admin

- **E-mail:** admin@andrevendas.com  
- **Senha:** admin123

## Variáveis de Ambiente

### Backend (`backend/.env`)
```
MONGODB_URI=<sua-connection-string>
JWT_SECRET=<seu-secret>
ADMIN_EMAIL=admin@andrevendas.com
ADMIN_PASSWORD=admin123
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
