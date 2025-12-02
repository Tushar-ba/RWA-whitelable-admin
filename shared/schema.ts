import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  integer,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const admins = pgTable("admins", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  roleId: varchar("role_id").references(() => roles.id),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appUsers = pgTable("app_users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  kycStatus: text("kyc_status").notNull().default("pending"), // verified, pending, rejected
  accountStatus: text("account_status").notNull().default("active"), // active, suspended
  joinDate: timestamp("join_date").defaultNow(),
  lastActivity: timestamp("last_activity"),
});

export const stock = pgTable("stock", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  asset: text("asset").notNull(), // gold, silver
  totalQuantity: decimal("total_quantity", {
    precision: 10,
    scale: 2,
  }).notNull(),
  reservedQuantity: decimal("reserved_quantity", {
    precision: 10,
    scale: 2,
  }).default("0"),
  availableQuantity: decimal("available_quantity", {
    precision: 10,
    scale: 2,
  }).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").notNull(),
});

export const stockHistory = pgTable("stock_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  asset: text("asset").notNull(),
  operationType: text("operation_type").notNull(), // addition, removal
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  updatedBy: varchar("updated_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseRequests = pgTable("purchase_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requestId: text("request_id").notNull().unique(),
  userEmail: text("user_email").notNull(),
  asset: text("asset").notNull(), // gold, silver
  usdcAmount: decimal("usdc_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  kycStatus: text("kyc_status").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed
  autoApproved: boolean("auto_approved").default(false),
  vaultAllocated: boolean("vault_allocated").default(false),
  vaultNumber: text("vault_number"),
  vaultLocation: text("vault_location"),
  allocationNotes: text("allocation_notes"),
  tokensMinted: boolean("tokens_minted").default(false),
  network: text("network").default("ethereum"), // canton, ethereum, solana
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const redemptionRequests = pgTable("redemption_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requestId: text("request_id").notNull().unique(),
  userEmail: text("user_email").notNull(),
  token: text("token").notNull(), // GLD, SLV
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  quantityGrams: text("quantity_grams").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed
  tokensBurned: boolean("tokens_burned").default(false),
  burnTransactionHash: text("burn_transaction_hash"),
  network: text("network").default("ethereum"), // canton, ethereum, solana
  notes: text("notes"),
  deliveryAddress: text("delivery_address"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletId: text("wallet_id").notNull().unique(),
  userEmail: text("user_email"),
  address: text("address").notNull(),
  goldBalance: decimal("gold_balance", { precision: 10, scale: 2 }).default(
    "0",
  ),
  silverBalance: decimal("silver_balance", { precision: 10, scale: 2 }).default(
    "0",
  ),
  status: text("status").notNull().default("active"), // active, frozen, unlinked
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftingTransactions = pgTable("gifting_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  giftId: text("gift_id").notNull().unique(),
  senderWallet: text("sender_wallet").notNull(),
  receiverWallet: text("receiver_wallet").notNull(),
  token: text("token").notNull(), // GLD, SLV
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // gifting, system_alert, transaction, user_action, purchase, redemption, mint, buyToken, redeemToken
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: text("related_id"),
  userEmail: text("user_email"),
  asset: text("asset"), // gold, silver
  quantity: text("quantity"),
  network: text("network"), // ethereum, canton, solana
  priority: text("priority").default("normal"), // high, normal, low, urgent
  isRead: boolean("is_read").default(false),
  targetAdminId: text("target_admin_id"), // Specific admin to notify
  targetRoles: json("target_roles").$type<string[]>().default([]), // Roles that should receive this notification
  targetPermissions: json("target_permissions").$type<string[]>().default([]), // Permissions that should receive this notification
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull(),
});

// Asset Storage for liquidity management
export const assetStorage = pgTable("asset_storage", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  asset: text("asset").notNull().unique(), // gold, silver
  storedValue: decimal("stored_value", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull(),
});

// Asset Liquidity Management History
export const assetLiquidityHistory = pgTable("asset_liquidity_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  asset: text("asset").notNull(), // gold, silver
  operationType: text("operation_type").notNull(), // update, mint_deduction
  previousValue: decimal("previous_value", {
    precision: 15,
    scale: 2,
  }).notNull(),
  newValue: decimal("new_value", { precision: 15, scale: 2 }).notNull(),
  changeAmount: decimal("change_amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"), // manual update description or mint transaction details
  relatedMintId: varchar("related_mint_id"), // reference to mint transaction if applicable
  updatedBy: varchar("updated_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mint Transactions
export const mintTransactions = pgTable("mint_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  transactionId: text("transaction_id").notNull().unique(),
  userEmail: text("user_email").notNull(),
  asset: text("asset").notNull(), // gold, silver
  mintAmount: decimal("mint_amount", { precision: 15, scale: 2 }).notNull(),
  goldValueDeducted: decimal("gold_value_deducted", {
    precision: 15,
    scale: 2,
  }).default("0"),
  silverValueDeducted: decimal("silver_value_deducted", {
    precision: 15,
    scale: 2,
  }).default("0"),
  network: text("network").default("ethereum"), // canton, ethereum, solana
  transactionHash: text("transaction_hash"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertAppUserSchema = createInsertSchema(appUsers).omit({
  id: true,
  joinDate: true,
  lastActivity: true,
});

export const insertStockSchema = createInsertSchema(stock).omit({
  id: true,
  lastUpdated: true,
});

export const insertStockHistorySchema = createInsertSchema(stockHistory).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseRequestSchema = createInsertSchema(
  purchaseRequests,
).omit({
  id: true,
  createdAt: true,
});

export const insertRedemptionRequestSchema = createInsertSchema(
  redemptionRequests,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
});

export const insertGiftingTransactionSchema = createInsertSchema(
  giftingTransactions,
).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(
  systemSettings,
).omit({
  id: true,
  updatedAt: true,
});

export const insertAssetStorageSchema = createInsertSchema(assetStorage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetLiquidityHistorySchema = createInsertSchema(
  assetLiquidityHistory,
).omit({
  id: true,
  createdAt: true,
});

export const insertMintTransactionSchema = createInsertSchema(
  mintTransactions,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;

export type Stock = typeof stock.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;

export type StockHistory = typeof stockHistory.$inferSelect;
export type InsertStockHistory = z.infer<typeof insertStockHistorySchema>;

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = z.infer<typeof insertPurchaseRequestSchema>;

export type RedemptionRequest = typeof redemptionRequests.$inferSelect;
export type InsertRedemptionRequest = z.infer<
  typeof insertRedemptionRequestSchema
>;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type GiftingTransaction = typeof giftingTransactions.$inferSelect;
export type InsertGiftingTransaction = z.infer<
  typeof insertGiftingTransactionSchema
>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export type AssetStorage = typeof assetStorage.$inferSelect;
export type InsertAssetStorage = z.infer<typeof insertAssetStorageSchema>;

export type AssetLiquidityHistory = typeof assetLiquidityHistory.$inferSelect;
export type InsertAssetLiquidityHistory = z.infer<
  typeof insertAssetLiquidityHistorySchema
>;

export type MintTransaction = typeof mintTransactions.$inferSelect;
export type InsertMintTransaction = z.infer<typeof insertMintTransactionSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type OTPForm = z.infer<typeof otpSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
