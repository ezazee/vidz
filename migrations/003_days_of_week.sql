-- Drop interval_type and add days_of_week
ALTER TABLE auto_schedules DROP COLUMN interval_type;
ALTER TABLE auto_schedules ADD COLUMN days_of_week VARCHAR(50) NOT NULL DEFAULT '0,1,2,3,4,5,6';
