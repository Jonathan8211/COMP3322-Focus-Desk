CREATE TABLE IF NOT EXISTS note_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_note_groups_user_name (user_id, name),
  UNIQUE KEY uq_note_groups_id_user (id, user_id),
  CONSTRAINT fk_note_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE notes
  ADD COLUMN group_id INT DEFAULT NULL,
  ADD KEY idx_notes_user_group (user_id, group_id),
  ADD CONSTRAINT fk_notes_group_owner FOREIGN KEY (group_id, user_id) REFERENCES note_groups(id, user_id);
