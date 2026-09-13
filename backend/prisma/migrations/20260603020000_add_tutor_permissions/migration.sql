-- AlterEnum: add tutor permission values
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'tutors_view';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'tutors_create';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'tutors_edit';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'tutors_delete';
