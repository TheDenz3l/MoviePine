#!/usr/bin/env bash
# Y-Router Management Script

PID_FILE=".y-router-proxy.pid"

case "${1:-help}" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "🟢 Y-Router proxy is already running (PID: $(cat $PID_FILE))"
        else
            echo "🚀 Starting Y-Router proxy (stable build)..."
            node y-router-stable.js &
            echo $! > "$PID_FILE"
            echo "✅ Y-Router proxy started (PID: $(cat $PID_FILE))"
        fi
        ;;
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                rm "$PID_FILE"
                echo "🛑 Y-Router proxy stopped"
            else
                echo "⚠️  Process not running, removing stale PID file"
                rm "$PID_FILE"
            fi
        else
            echo "❌ Y-Router proxy is not running"
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "🟢 Y-Router proxy is running (PID: $(cat $PID_FILE))"
            echo "📍 URL: http://localhost:3456"
            curl -s http://localhost:3456/health | jq . 2>/dev/null || echo "Health check failed"
        else
            echo "🔴 Y-Router proxy is not running"
        fi
        ;;
    logs)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "📋 Y-Router proxy logs (PID: $(cat $PID_FILE)):"
            ps aux | grep "y-router-stable.js" | grep -v grep
        else
            echo "🔴 Y-Router proxy is not running"
        fi
        ;;
    test)
        echo "🧪 Testing Y-Router proxy..."
                echo "➡️  Test 1 (alias model -> mapping)"
                curl -s -X POST http://localhost:3456/v1/messages \
                    -H "Content-Type: application/json" \
                    -d '{
                        "model": "claude-3-5-sonnet-20240620",
                        "messages": [{"role": "user", "content": [{"type":"text","text":"Say 'OK' if mapping works"}]}],
                        "max_tokens": 20
                    }' | jq .content[0].text -r 2>/dev/null || echo "❌ Test 1 failed"
                echo "➡️  Test 2 (provider model direct)"
                curl -s -X POST http://localhost:3456/v1/messages \
                    -H "Content-Type: application/json" \
                    -d '{
                        "model": "provider-6/claude-opus-4-20250514",
                        "messages": [{"role": "user", "content": [{"type":"text","text":"Respond with 'OPUS'"}]}],
                        "max_tokens": 20
                    }' | jq .content[0].text -r 2>/dev/null || echo "❌ Test 2 failed"
        ;;
    env)
        echo "🔧 Claude Code environment:"
        echo "source ~/.claude_env"
        echo ""
        echo "Or set manually:"
        echo "export ANTHROPIC_BASE_URL=\"http://localhost:3456\""
        echo "export ANTHROPIC_API_KEY=\"ddc-a4f-c7be883171b74a1e90920ac1368fb23d\""
        echo "export ANTHROPIC_MODEL=\"provider-6/claude-sonnet-4-20250514-thinking\""
        echo "export ANTHROPIC_LARGE_MODEL=\"provider-6/claude-opus-4-20250514\""
        ;;
    help|*)
        echo "🔧 Y-Router Management Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|test|env|help}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Y-Router proxy"
        echo "  stop    - Stop Y-Router proxy"
        echo "  restart - Restart Y-Router proxy"
        echo "  status  - Check proxy status and health"
        echo "  logs    - Show proxy process info"
        echo "  test    - Test proxy with sample request"
        echo "  env     - Show environment setup"
        echo "  help    - Show this help"
        ;;
esac
