"use client";

export interface PaymentMethod {
  id: string;
  name: string;
  isCashEquivalent: boolean; // e.g., Cash, Card, Apple Pay, Google Pay
  isCredit: boolean; // e.g., Credit Account
  isBNPL: boolean; // e.g., Afterpay, Klarna
}