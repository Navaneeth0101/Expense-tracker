# Smart Expense Tracker

Smart Expense Tracker is a simple web-based application designed to help users monitor their daily spending and manage recurring subscriptions in an organized way. The system focuses on simplicity and clarity, allowing users to understand their spending habits through structured data and basic statistics.

## Expense Tracking

Users can record their daily expenses by entering the amount, category, date, and an optional note. Each expense is stored and displayed in the expense history.

Example:

Amount: ₹250  
Category: Food  
Date: 10 Oct  
Note: Lunch  

The system stores this information and allows users to review their spending history.

---

## Expense Categories

Expenses are organized into categories to make spending analysis easier.

Example categories include:
- Food
- Transport
- Shopping
- Bills
- Subscriptions
- Other

Example:

₹300 – Food  
₹100 – Transport  
₹500 – Shopping  

The system can then calculate how much the user spends in each category.

---

## Expense History

All expenses entered by the user are stored and displayed in a list sorted by date. This allows users to review their past spending.

Example:

10 Oct | Food | ₹250  
9 Oct | Transport | ₹60  
9 Oct | Shopping | ₹500  

---

## Monthly Spending Summary

The application automatically calculates the total amount spent during the current month.

Example:

Total Spent (October): ₹8,450

This helps users quickly understand their monthly spending.

---

## Subscription Tracker

The application allows users to track recurring subscriptions such as streaming services or software subscriptions.

Each subscription entry contains:
- Subscription name
- Cost
- Renewal date

Example:

Netflix — ₹649 — 15 Oct  
Spotify — ₹119 — 20 Oct  

This helps users keep track of recurring payments.

---

## High Expense Month Detector

The system analyzes subscription renewal dates and detects months where multiple subscriptions occur.

Example:

Netflix — 15 March  
Spotify — 18 March  
Cloud Storage — 20 March  
Software License — 25 March  

If several subscriptions occur in the same month, the system generates a warning.

Example output:

Warning: March has multiple subscription payments.  
Estimated recurring cost: ₹2,150

This feature helps users anticipate months with higher expenses.

---

## Spending Statistics

The system provides basic spending statistics using simple charts and summaries.

Example:

Food — ₹3,000  
Transport — ₹800  
Shopping — ₹1,500  

These statistics can be displayed using graphs or charts to help users better understand their spending patterns.
