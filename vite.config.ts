import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

function lazarusDeployPlugin(): Plugin {
  return {
    name: 'lazarus-deploy-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // 1. POST /api/project/export-zip
        if (req.method === 'POST' && url.startsWith('/api/project/export-zip')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const { projectName = 'projeto', files = {} } = data;
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: `Pacote de build para '${projectName}' empacotado com sucesso.`,
                filesCount: Object.keys(files).length
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }

        // 2. POST /api/project/deploy
        if (req.method === 'POST' && url.startsWith('/api/project/deploy')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const { projectId = `app_${Date.now()}`, projectName = 'ProjetoWeb', files = {} } = data;
              const deployDir = path.resolve(process.cwd(), 'deployments', projectId);

              if (!fs.existsSync(deployDir)) {
                fs.mkdirSync(deployDir, { recursive: true });
              }

              for (const [relPath, content] of Object.entries(files)) {
                const filePath = path.resolve(deployDir, relPath);
                const fileDir = path.dirname(filePath);
                if (!fs.existsSync(fileDir)) {
                  fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(filePath, String(content), 'utf-8');
              }

              const deployUrl = `/apps/${projectId}/index.html`;
              const host = req.headers.host || 'localhost:5173';
              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const fullUrl = `${protocol}://${host}${deployUrl}`;

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                projectId,
                projectName,
                deployUrl,
                fullUrl,
                timestamp: Date.now(),
                filesCount: Object.keys(files).length,
                message: `Aplicação '${projectName}' publicada com sucesso na Nuvem da IDE!`
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }

        // 3. GET /apps/:projectId/* or /deployments/:projectId/*
        const appMatch = url.match(/^\/(?:apps|deployments)\/([^/?#]+)(\/.*)?$/);
        if (req.method === 'GET' && appMatch) {
          const projectId = appMatch[1];
          const rawSubPath = appMatch[2];

          // Se a rota for apenas /apps/:projectId ou /apps/:projectId/, redireciona explicitamente para /index.html
          if (!rawSubPath || rawSubPath === '/') {
            res.writeHead(302, { Location: `/apps/${projectId}/index.html` });
            res.end();
            return;
          }

          // Remove query params, hash e barras iniciais de forma agnóstica a SO (Windows backslash e Unix slash)
          const cleanSub = rawSubPath
            .split('?')[0]
            .split('#')[0]
            .replace(/^[/\\]+/, '')
            .replace(/\.\.[/\\]/g, '') || 'index.html';

          const filePath = path.join(process.cwd(), 'deployments', projectId, cleanSub);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.html': 'text/html; charset=utf-8',
              '.js': 'application/javascript; charset=utf-8',
              '.css': 'text/css; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.pas': 'text/plain; charset=utf-8',
              '.lfm': 'text/plain; charset=utf-8',
              '.lpr': 'text/plain; charset=utf-8'
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain; charset=utf-8');
            res.statusCode = 200;
            const content = fs.readFileSync(filePath);
            res.end(content);
            return;
          } else {
            // Se a URL pertence a /apps/ ou /deployments/ mas o arquivo não existe,
            // NÃO chamamos next() para evitar que o Vite sirva a IDE (fallback SPA root)
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:3rem;"><h2>404 - Aplicação ou Arquivo Não Encontrado</h2><p>O arquivo <code>${cleanSub}</code> não foi localizado na publicação do projeto <code>${projectId}</code>.</p><p><a href="/" style="color:#38bdf8;">Voltar para o Lazarus Web IDE</a></p></body></html>`);
            return;
          }
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lazarusDeployPlugin()],
})

