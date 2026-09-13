-- Fix WhatsAppInstance data: move UUID from phoneNumber to instanceId
UPDATE "WhatsAppInstance" 
SET "instanceId" = "phoneNumber", 
    "phoneNumber" = NULL 
WHERE "instanceId" IS NULL 
  AND "phoneNumber" IS NOT NULL 
  AND "phoneNumber" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
