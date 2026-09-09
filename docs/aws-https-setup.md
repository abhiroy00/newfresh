# AWS HTTPS Setup — ACM + ALB + Route 53

How `https://api.gmartfresh.com` is connected to EC2 port 8000 without touching Nginx or SSL on the server.

---

## Architecture Overview

```
User's Browser
      │
      │  https://api.gmartfresh.com  (port 443)
      ▼
┌─────────────────────┐
│     Route 53        │  DNS: api.gmartfresh.com → ALB DNS name (Alias A record)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ALB                │  ← ACM SSL certificate attached here
│  (Load Balancer)    │  Port 443 → terminates HTTPS, forwards to EC2
│                     │  Port 80  → redirects to HTTPS (301)
└──────────┬──────────┘
           │
           │  Plain HTTP on port 8000 (private AWS network)
           ▼
┌─────────────────────┐
│  EC2 (t3.small)     │  FastAPI in Docker, port 8000
│  13.200.184.107     │  Never sees HTTPS — only plain HTTP from ALB
└─────────────────────┘
```

---

## Components

### 1. ACM — AWS Certificate Manager
- Issues and auto-renews free SSL/TLS certificates
- Validation method: **DNS validation** — ACM provides a CNAME record, you add it to Route 53, ACM confirms domain ownership and issues the cert
- The certificate is attached to the ALB, not stored on EC2

### 2. ALB — Application Load Balancer
- Receives all public HTTPS traffic
- Terminates SSL (decrypts using the ACM cert)
- Forwards plain HTTP to the EC2 target group on port 8000
- Runs health checks on `/health` every 30s — stops routing if EC2 is unhealthy
- Two listeners:
  - **Port 443** → forward to Target Group (EC2:8000)
  - **Port 80** → redirect to `https://` (HTTP 301)

### 3. Target Group
- Logical group containing your EC2 instance
- Protocol: HTTP, Port: 8000
- Health check path: `/health`

### 4. Route 53
- DNS record type: **Alias A record** (not a plain A record or CNAME)
- `api.gmartfresh.com` → ALB's DNS name (e.g. `freshdirect-api-alb-xxxx.ap-south-1.elb.amazonaws.com`)
- Alias records are free and resolve faster than CNAME

### 5. Security Groups
| Resource | Inbound Rules |
|---|---|
| ALB SG | 80 from `0.0.0.0/0`, 443 from `0.0.0.0/0` |
| EC2 SG | 8000 from ALB SG only (not public internet) |

Port 8000 is only reachable from the ALB — not directly from the internet.

---

## Request Lifecycle

```
1.  Browser resolves api.gmartfresh.com via Route 53
2.  Route 53 returns ALB's DNS name
3.  Browser connects to ALB on port 443
4.  ALB presents the ACM certificate → TLS handshake completes
5.  ALB decrypts the HTTPS request
6.  ALB checks target group → EC2:8000 is healthy
7.  ALB forwards plain HTTP request to EC2 on port 8000
8.  FastAPI processes the request, returns response
9.  ALB encrypts the response and sends it back to the browser
```

EC2 only ever handles plain HTTP. All encryption is managed by the ALB + ACM.

---

## Why ALB Instead of Nginx on EC2

| | ALB + ACM | Nginx + Certbot on EC2 |
|---|---|---|
| SSL renewal | Automatic (AWS managed) | Manual cron / certbot timer |
| Config | Zero files on EC2 | nginx.conf + certs on disk |
| Scaling | Add more EC2s with one click | Manual config on each server |
| Cost | ~$16–20/month | Free |
| Failure point | AWS-managed, highly available | Single EC2 process |

For a production app, the operational simplicity of ALB outweighs the cost.

---

## Setup Commands (CloudShell, ap-south-1)

Run once. Script at `setup-alb-https.sh` in the repo root.

```bash
# In AWS CloudShell
git clone https://github.com/Kumar-vikalp/freshdirect-fullStack.git
cd freshdirect-fullStack
bash setup-alb-https.sh
```

What the script does:
1. Discovers VPC, subnets, EC2 security group automatically
2. Requests ACM certificate for `api.gmartfresh.com`
3. Adds DNS validation CNAME to Route 53
4. Waits for certificate to be issued (~2 mins)
5. Creates ALB security group (80 + 443 open)
6. Creates target group pointing to EC2:8000
7. Creates ALB with HTTPS listener (443) and redirect listener (80)
8. Updates Route 53 A record to ALB alias

---

## CORS

After setting up HTTPS, the backend's `ALLOWED_ORIGINS` must include the frontend domains. Configured in `~/app/freshdirect-backend/.env` on EC2:

```
ALLOWED_ORIGINS=["https://gmartfresh.com","https://www.gmartfresh.com","https://main.d1cr5kgmgeoc49.amplifyapp.com","http://localhost:5173"]
```

After editing `.env`, force-recreate the container to reload:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --force-recreate api
```

---

## Current Infrastructure

| Resource | Value |
|---|---|
| EC2 IP | `13.200.184.107` |
| EC2 Instance ID | `i-044e42853cbb4d3fa` |
| Region | `ap-south-1` (Mumbai) |
| API (HTTPS) | `https://api.gmartfresh.com` |
| API (direct) | `http://13.200.184.107:8000` |
| Admin Panel | `https://main.d1cr5kgmgeoc49.amplifyapp.com` |
| ALB Name | `freshdirect-api-alb` |
| Target Group | `freshdirect-api-tg` |
| ACM Cert | `api.gmartfresh.com` (DNS validated) |
