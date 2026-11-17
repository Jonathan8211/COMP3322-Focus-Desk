CREATE TABLE daily_mood_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  daily_entry_id INT NOT NULL,
  source_version CHAR(64) NOT NULL,
  score TINYINT UNSIGNED NOT NULL,
  label VARCHAR(32) NOT NULL,
  response_text VARCHAR(240) NOT NULL,
  model_id VARCHAR(64) NOT NULL,
  analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mood_entry (daily_entry_id),
  KEY idx_mood_user (user_id),
  CONSTRAINT fk_mood_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mood_entry FOREIGN KEY (daily_entry_id) REFERENCES daily_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
