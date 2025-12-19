-- ============================================
-- TRAPMAP - PUSH NOTIFICATIONS TABLES
-- Tabellen für Web Push Subscriptions
-- ============================================

-- Push Subscriptions Tabelle
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Web Push Subscription Data
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  
  -- Reminder Settings
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before DECIMAL(3,1) DEFAULT 1.0,
  reminder_time TIME DEFAULT '08:00',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_partner ON push_subscriptions(partner_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_reminder ON push_subscriptions(reminder_enabled) WHERE reminder_enabled = true;

-- Reminder Log (verhindert mehrfaches Senden pro Tag)
CREATE TABLE IF NOT EXISTS push_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  boxes_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für tägliche Prüfung
CREATE INDEX IF NOT EXISTS idx_reminder_log_user_date 
  ON push_reminder_log(user_id, sent_at);

-- Cleanup: Alte Logs nach 30 Tagen löschen (optional als Function)
CREATE OR REPLACE FUNCTION cleanup_old_reminder_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM push_reminder_log 
  WHERE sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_reminder_log ENABLE ROW LEVEL SECURITY;

-- Policy: User kann nur eigene Subscriptions sehen
CREATE POLICY push_subs_user_policy ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Service Role hat vollen Zugriff
CREATE POLICY push_subs_service_policy ON push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Kommentar
COMMENT ON TABLE push_subscriptions IS 'Web Push Subscriptions für Browser-Benachrichtigungen';
COMMENT ON COLUMN push_subscriptions.reminder_days_before IS 'Tage vor Fälligkeit für Erinnerung (z.B. 1.5 = 1,5 Tage)';
