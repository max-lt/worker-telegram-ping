# ServiceWorker to monitor a website

#### Prevent wrangler.toml updtes to be committed
```bash
git update-index --skip-worktree wrangler.toml
```

#### Add to following to wrangler.toml 
```toml
kv_namespaces = [
  { binding = "kv", preview_id = "your-preview-id", id = "your-id" }
]

[vars]
CHANNEL_ID = "your-cannel-id"
BOT_TOKEN = "your-bot-token"
```
