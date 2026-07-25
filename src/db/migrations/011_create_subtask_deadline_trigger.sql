-- Migration 011 — subtask deadline check trigger

DROP TRIGGER IF EXISTS trg_subtask_deadline_check;

DELIMITER //
CREATE TRIGGER trg_subtask_deadline_check
BEFORE INSERT ON tasks
FOR EACH ROW
BEGIN
  IF NEW.parent_task_id IS NOT NULL THEN
    DECLARE parent_deadline DATETIME;
    SELECT deadline INTO parent_deadline FROM tasks WHERE id = NEW.parent_task_id;
    IF NEW.deadline > parent_deadline THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subtask deadline cannot exceed parent task deadline';
    END IF;
  END IF;
END//
DELIMITER ;
