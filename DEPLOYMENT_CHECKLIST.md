# Deployment Checklist — Integrated Quant Terminal

## Pre-Deployment Verification ✅

### Environment Setup
- [ ] `.env` file created from `.env.example`
- [ ] `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` is set and valid
- [ ] `JWT_SECRET` is set (auto-generated if needed)
- [ ] `CORS_ORIGINS` configured for your domain
- [ ] `LOG_LEVEL` set appropriately (INFO for production)

### Backend
- [ ] Python 3.11+ installed
- [ ] Virtual environment created (`venv/`)
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Database initialized successfully (run `start.sh` once)
- [ ] Port 8000 is available (no conflicts)

### Frontend
- [ ] Node.js 18+ installed
- [ ] npm dependencies installed (`npm install` in `frontend/`)
- [ ] Port 3000 is available (no conflicts)
- [ ] `NEXT_PUBLIC_API_URL` configured (if using Docker)

### Testing
- [ ] Health check passes: `curl http://localhost:8000/health`
- [ ] API docs accessible: `http://localhost:8000/docs`
- [ ] Frontend loads: `http://localhost:3000`
- [ ] Can signup/login successfully
- [ ] Can perform stock analysis (within rate limit)

---

## Local Development Deployment

### Step 1: Clone/Setup
```bash
# Navigate to project
cd /path/to/Integrated Quant Terminal

# Make start script executable
chmod +x start.sh
```

### Step 2: Configure Environment
```bash
# Copy template
cp backend/.env.example backend/.env

# Edit and add your API key
nano backend/.env
# Add: ANTHROPIC_API_KEY=sk-ant-xxx
# OR: GEMINI_API_KEY=xxx
```

### Step 3: Start Services
```bash
./start.sh
```

### Step 4: Verify
- [ ] Backend logs show "✅ Backend running at http://localhost:8000"
- [ ] Frontend logs show "✅ Frontend running at http://localhost:3000"
- [ ] No error messages in console

### Step 5: Test
```bash
# Open in browser
open http://localhost:3000

# Or test API
curl http://localhost:8000/health
```

---

## Docker Deployment

### Step 1: Install Docker
- [ ] Docker Desktop installed (includes Docker Compose)
- [ ] Docker daemon running

### Step 2: Configure Environment
```bash
cp backend/.env.example backend/.env
nano backend/.env
# Add API keys
```

### Step 3: Build & Start
```bash
docker-compose up --build
```

### Step 4: Verify
```bash
# Check services
docker ps

# Should show both backend and frontend containers running
# Backend: port 8000
# Frontend: port 3000
```

### Step 5: Access
- [ ] Frontend: http://localhost:3000
- [ ] API Docs: http://localhost:8000/docs
- [ ] Health: http://localhost:8000/health

### Step 6: Stop (when done)
```bash
docker-compose down
```

---

## Production Deployment (Best Practices)

### Security
- [ ] Use HTTPS/SSL (not HTTP)
- [ ] Set strong `JWT_SECRET` (40+ chars)
- [ ] Use environment variables, never commit secrets
- [ ] Enable CSRF protection if applicable
- [ ] Set restrictive CORS_ORIGINS (only your domain)
- [ ] Use strong database password/encryption

### Scaling
- [ ] Use managed database (PostgreSQL, not SQLite)
- [ ] Add Redis cache for market data
- [ ] Use CDN for static assets
- [ ] Set up load balancer if needed
- [ ] Configure auto-scaling policies

### Monitoring & Logging
- [ ] Set up error tracking (Sentry, DataDog)
- [ ] Configure centralized logging
- [ ] Set up alerts for errors/downtime
- [ ] Monitor API response times
- [ ] Track rate limit usage

### Performance
- [ ] Enable gzip compression
- [ ] Set appropriate cache headers
- [ ] Use production-grade web server (gunicorn for Python)
- [ ] Configure health check endpoint
- [ ] Implement request timeouts

### Deployment Infrastructure
- [ ] Use container orchestration (Kubernetes, Docker Swarm)
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)
- [ ] Regular backups of database
- [ ] Disaster recovery plan
- [ ] Rollback procedure

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Check Python version
python3 --version  # Should be 3.11+

# Check for syntax errors
python3 -m py_compile backend/main.py

# Check dependencies
pip list | grep -E "fastapi|uvicorn"
```

### Frontend won't start
```bash
# Check Node version
node --version  # Should be 18+

# Check npm
npm --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API key errors
```bash
# Verify API key in .env
cat backend/.env | grep -E "ANTHROPIC|GEMINI"

# Test API key manually
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
```

### Database locked
```bash
# Check for running processes
lsof backend/iqt.db

# Reset database
rm backend/iqt.db

# Restart
./start.sh
```

### Port already in use
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use different port
# Edit backend config to use different port
```

---

## Performance Checklist

### Backend
- [ ] Response time < 2s for analysis
- [ ] Queries complete in < 500ms
- [ ] No memory leaks (monitor over time)
- [ ] Connection pool configured
- [ ] Rate limiting enforced

### Frontend
- [ ] Page load < 3s
- [ ] Time to interactive < 2s
- [ ] Bundle size < 200KB (gzipped)
- [ ] No console errors
- [ ] Smooth animations (60fps)

### Infrastructure
- [ ] CPU usage < 50% under load
- [ ] Memory usage stable
- [ ] Disk I/O reasonable
- [ ] Network latency acceptable
- [ ] Uptime > 99.5%

---

## Rollback Plan

### If deployment fails:

1. **Identify the issue**
   - Check logs: `docker-compose logs backend`
   - Check error details in API response
   - Review recent changes

2. **Rollback to previous version**
   ```bash
   git revert HEAD
   docker-compose down
   docker-compose up --build
   ```

3. **Verify rollback**
   - Test all functionality again
   - Check API health endpoint
   - Monitor error rates

4. **Post-mortem**
   - Document what went wrong
   - Update checklist if needed
   - Plan to prevent in future

---

## Post-Deployment Tasks

### Day 1
- [ ] Monitor error rates and logs
- [ ] Test all core features
- [ ] Check performance metrics
- [ ] Verify backups are running

### Week 1
- [ ] Gather user feedback
- [ ] Monitor for any issues
- [ ] Update documentation if needed
- [ ] Plan any quick fixes

### Month 1
- [ ] Full security audit
- [ ] Performance review
- [ ] Database optimization
- [ ] User engagement analysis

---

## Maintenance Schedule

### Daily
- [ ] Monitor uptime (auto-monitoring)
- [ ] Check error logs
- [ ] Verify backups

### Weekly
- [ ] Review performance metrics
- [ ] Check security alerts
- [ ] Update dependencies check

### Monthly
- [ ] Full database backup test
- [ ] Security audit
- [ ] Performance review
- [ ] Code quality review

### Quarterly
- [ ] Major version upgrades
- [ ] Comprehensive security audit
- [ ] Infrastructure review
- [ ] Capacity planning

---

## Contact & Support

| Role | Contact | Availability |
|------|---------|--------------|
| Tech Lead | [Your email] | Business hours |
| On-call | [Escalation] | 24/7 |
| API Vendor | [Anthropic/Google support] | Support portal |

---

## Documentation References

- [QUICKSTART.md](QUICKSTART.md) — Setup guide
- [IMPROVEMENTS.md](IMPROVEMENTS.md) — Technical details
- [BEFORE_AFTER.md](BEFORE_AFTER.md) — Comparison
- [README.md](README.md) — Project overview
- API Docs: http://localhost:8000/docs

---

**Deployment Ready!** 🚀

All checks completed. The application is ready for deployment.

---

**Last Updated**: May 17, 2026
**Next Review**: [Scheduled date]
