-- Account deletion: everything a user created goes with the user, except notebooks they own
-- (the owner must delete or hand over those first; enforced in the API).
ALTER TABLE sources DROP CONSTRAINT sources_uploaded_by_fkey,
  ADD CONSTRAINT sources_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE questions DROP CONSTRAINT questions_asked_by_fkey,
  ADD CONSTRAINT questions_asked_by_fkey FOREIGN KEY (asked_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE quizzes DROP CONSTRAINT quizzes_created_by_fkey,
  ADD CONSTRAINT quizzes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE quiz_attempts DROP CONSTRAINT quiz_attempts_user_id_fkey,
  ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE activity DROP CONSTRAINT activity_user_id_fkey,
  ADD CONSTRAINT activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE assignments DROP CONSTRAINT assignments_assignee_id_fkey,
  ADD CONSTRAINT assignments_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE assignments DROP CONSTRAINT assignments_assigned_by_fkey,
  ADD CONSTRAINT assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invites DROP CONSTRAINT invites_created_by_fkey,
  ADD CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
