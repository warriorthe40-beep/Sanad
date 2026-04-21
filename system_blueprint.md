
Sanad
Warranty & Receipt Organizer
Software Engineering Project
Progress Report
Prepared by:
Ahmed Habtoor — 443043603
Abo Ammar — 443050663
Supervised by:
Dr. Ahmad Badreddin Alkhodre
February 2026
 
1. Introduction
Sanad (سند) is a personal purchase management application that helps users organize their purchases, store receipts, track warranties, and understand their spending habits.
The problem is simple: people lose track of their receipts and warranties. When a product breaks, they cannot find the receipt, do not know if it is still under warranty, and end up paying for repairs that should have been free. This is especially common in Saudi Arabia, where extreme heat causes appliances and electronics to fail frequently.
To understand why this matters, it helps to know how warranties actually work. A warranty is a promise from the manufacturer or store to fix or replace a product within a certain period. But that promise is useless on its own — to use it, you must prove when you bought the product. That proof is the receipt. Without it, no store or manufacturer will honor the warranty. The receipt is not just a piece of paper — it is the key that activates the warranty. Most receipts are printed on thermal paper that fades within months, and digital photos get buried in camera rolls. Sanad solves this by storing receipts in a structured, searchable system with automatic warranty tracking and expiry alerts.
Not every purchase has a warranty. A coffee from Starbucks or a shirt from Zara has no warranty, but it still has a receipt and a price. Sanad works for all purchases — warranted or not. The warranty and return fields are always optional, so the app is useful whether you are tracking a 15,000 SAR laptop or a 27 SAR coffee.
The application is organized into three integrated layers: a Purchase Logger for recording any purchase, a Warranty and Return Tracker for items that have coverage (with smart community-based suggestions and expiry alerts), and a Spending Analytics dashboard for understanding spending habits. Additionally, the app features AI-powered receipt scanning that can automatically read a receipt photo and extract the store name, price, and date, and push notifications to alert users about expiring warranties even when the app is not open.
The system has two actors: a User who logs purchases and tracks warranties, and an Admin who manages product categories, store policies, and community data quality.
2. Requirements Gathering
The requirements for Sanad were gathered through three methods: personal experience, peer discussions, and brainstorming.
Both team members have personally missed warranty claims because we could not find receipts when we needed them. This firsthand frustration was the starting point and helped us understand the core problem from a user’s perspective.
We then discussed the idea with classmates and family members. Most confirmed that they have no system for tracking warranties and have lost money because of it. These conversations helped us identify which features would be most valuable — for example, several people said they would use the app even without warranty tracking, just to see where their money goes each month. This led us to make the spending analytics a core feature rather than an afterthought.
Finally, we brainstormed additional features by thinking through real scenarios: What happens when you buy something? What do you do when it breaks? What information do you wish you had? This process led to features like the Quick Add button for fast everyday logging, community warranty suggestions so users do not have to research warranty periods themselves, AI receipt scanning to reduce manual data entry, and push notifications so users never miss an expiring warranty.
The gathered requirements were documented as functional and non-functional requirements, following the approach discussed in our course material.
3. Functional Requirements
Functional requirements describe the services the system should provide. Note that warranty and return window fields are optional — users can log purchases without entering warranty information.
Requirement	Description
Register Account	The system shall allow new users to create an account by providing a name, email, and password.
Login	The system shall authenticate users and admins using email and password, and route them to the appropriate dashboard based on their role.
Add Purchase (Full)	The system shall allow users to add a purchase using the full form with the following fields: product name (required), store (required), category (auto-suggested from store, required), price (required), purchase date (defaults to today), warranty duration (optional, auto-suggested from community data), return window (optional, auto-suggested), document photos such as receipt or warranty card (optional, with AI scanning available), and notes (optional free text). This form is intended for expensive or warranted items where the user wants a complete record.
Quick Add Purchase	The system shall provide a simplified three-field form for fast everyday logging: store name (typed by user), category (auto-suggested based on the store name from the store database, user can change), and price. The date defaults to today. No product name, warranty, return window, document, or notes fields are shown. This form is intended for small daily purchases like coffee, meals, and groceries where speed matters more than detail.
Upload Documents	The system shall allow users to optionally upload one or more photos (receipt, warranty card, invoice) when adding or editing a purchase.
AI Receipt Scanning	When a user uploads a receipt photo, the system shall use AI vision to automatically extract the store name, total amount, and purchase date, and auto-fill the form fields. The user can review and adjust before saving.
Edit Purchase	The system shall allow users to modify any field of an existing purchase, including adding warranty info or documents after the initial entry.
Delete Purchase	The system shall allow users to remove a purchase record from their history.
Search and Filter	The system shall allow users to search purchases by product name and filter by category, store, warranty status, or date range.
View Purchase Details	The system shall display full purchase details including product info, document photos (if any), warranty status with countdown (if warranty was entered), and store information.
Community Suggestions	When the user selects a store and category, the system shall display typical warranty and return window values based on aggregated data from other users. The user can accept, modify, or skip.
Warranty Alerts	For purchases where a warranty or return window was entered, the system shall generate alerts at 90, 60, 30, and 7 days before expiry.
Push Notifications	The system shall send push notifications to the user’s device when a warranty or return window is about to expire, even when the app is not actively open.
Report Issue	The system shall allow users to report an issue on any purchase with an active warranty, with a description and optional damage photo, displaying the receipt and warranty info alongside.
Spending Analytics	The system shall display spending analytics including total spending, spending by category, monthly trends, and warranty coverage percentage.
Manage Categories	The system shall allow the admin to add, edit, or remove product categories.
Manage Store Policies	The system shall allow the admin to manage store listings and their baseline warranty and return policies per category.
Monitor Community Data	The system shall allow the admin to view aggregated community data and flag incorrect outlier entries.

5. Non-Functional Requirements
Non-functional requirements define system properties and constraints. As discussed in our course material, if these are not met, the system may be useless.
Category	Requirement
Performance	All pages and calculations shall load within 2 seconds under normal conditions.
Performance	AI receipt scanning shall return extracted data within 5 seconds of photo upload.
Usability	A user shall be able to quick-add a purchase in under 10 seconds without training.
Usability	The app shall be responsive and work on both mobile and desktop screens.
Reliability	All purchase data and uploaded documents shall persist between sessions.
Reliability	Warranty alerts and push notifications shall be generated accurately with no missed notifications.
Security	Passwords shall meet minimum strength requirements (at least 8 characters).
Security	Each user shall only access their own data. Admin features shall be restricted to admin accounts.
Portability	The app shall run on any modern browser (Chrome, Safari, Firefox, Edge) without installation.
Data Integrity	The system shall validate all inputs, rejecting negative prices, future dates, or empty required fields.

6. System Architecture
Sanad follows a Layered Architecture pattern, which organizes the system into layers with related functionality. As discussed in Chapter 4 of our course material, this pattern supports incremental development and clean separation of concerns.
Presentation Layer: The user-facing interface including all pages: login, purchase list, add/edit forms, purchase details, alerts, analytics dashboard, and admin panel. Built using React with responsive design. The MVC pattern is applied within this layer — components serve as the View, state management as the Model, and event handlers as the Controller.
Application Logic Layer: Contains the core business logic: warranty expiry calculations, alert scheduling, community suggestion aggregation, AI receipt scanning (sending receipt images to a vision API and parsing the response), spending analytics computations, push notification scheduling, and input validation.
Data Storage Layer: Manages data persistence. The prototype uses localStorage for personal data and a pre-loaded dataset for community suggestions. The architecture is designed so this layer can be replaced with a cloud database without affecting the layers above.
Authentication Layer: Handles registration, login, session management, and role-based access control (User vs Admin). Simulated in the prototype using localStorage, but designed for future integration with a real authentication provider.
External Services Layer: The AI receipt scanning feature communicates with an external AI vision API (Anthropic API) to extract text from receipt images. This layer is isolated so the API provider can be swapped without affecting the rest of the system.

7. Use-Case Diagram
6.1 Use Case Descriptions
1.	Register Account: The user should be able to register a new account by providing a name, email, and password.
2.	Login: The user or admin should be able to log in using their credentials to access their respective dashboards.
3.	Add Purchase: The user should be able to add a purchase with required fields (product name, store, category, price, date) and optional fields (warranty, return window, documents, notes).
4.	Quick Add Purchase: The user should be able to quickly log a purchase by entering only the price and store name, with category and date auto-filled.
5.	Edit Purchase: The user should be able to edit any existing purchase, including adding warranty info or documents later.
6.	Delete Purchase: The user should be able to delete a purchase from their history.
7.	Search & Filter Purchases: The user should be able to search by product name and filter by category, store, warranty status, or date.
8.	View Purchase Details: The user should be able to view full details of any purchase including documents, warranty countdown (if applicable), and store info.
9.	Upload Documents: The system should allow the user to optionally upload receipt and warranty photos. (Included by Add Purchase)
10.	Validate Input: The system should validate all inputs before saving to ensure correctness. (Included by Add Purchase)
11.	Show Community Suggestions: The system should display warranty and return suggestions based on other users’ data when a store and category are selected. (Included by Add Purchase)
12.	AI Receipt Scanning: When a receipt photo is uploaded, the system should use AI vision to extract the store name, price, and date and auto-fill the form. (Extends Add Purchase)
13.	Zoom Receipt Photo: The user may optionally zoom into a document photo to read fine print. (Extends View Purchase Details)
14.	View Warranty Alerts: The user should be able to view notifications about warranties and return windows expiring soon.
15.	Receive Push Notifications: The system should send push notifications to the user’s device about expiring warranties even when the app is not open.
16.	Report Issue / File Claim: The user should be able to report a product issue with a description and photo, with receipt and warranty info displayed alongside.
17.	View Spending Analytics: The user should be able to view spending charts, totals, trends, and warranty coverage statistics.
18.	Manage Categories: The admin should be able to add, edit, or remove product categories.
19.	Manage Store Policies: The admin should be able to manage store listings and baseline warranty policies per category.
20.	Monitor Community Data: The admin should be able to view community data quality and flag incorrect entries.

7. Class Diagram
The class diagram shows the main classes in the Sanad system, their attributes, operations, and relationships. Following UML conventions from Chapter 7, the diagram uses associations with multiplicity to show linkages between classes, and generalization to group Admin as a specialization of User.
The key classes are: User (with Admin as a generalization of it), Purchase (the core data entity with optional warranty fields), Document (receipt/warranty photos attached to purchases), Store and StorePolicy (managing store information and community-sourced warranty suggestions), Category (product categories), Alert (warranty expiry notifications and push notifications), Claim (issue reporting against active warranties), Analytics (spending calculations and trends), and ReceiptScanner (AI-powered receipt data extraction via the Anthropic API).
Notable relationships include: a User has many Purchases, each Purchase can have zero or more Documents (since photos are optional), each Purchase can generate zero or more Alerts (only if warranty was entered), and each Purchase can have zero or one Claim. The StorePolicy class aggregates community data by store and category combination to generate warranty suggestions.
 

8. Sequence Diagram
The sequence diagram illustrates the most complex flow in the system: adding a purchase with AI receipt scanning and community warranty suggestions. Following UML conventions from Chapter 8, each object is shown as an instance of its class using the :ClassName notation (e.g., :Purchase, :Alert), with lifelines extending downward and activation boxes indicating when each object is active. Messages are shown as arrows between activation boxes.
The flow begins when the user opens the Add Purchase form and takes a photo of their receipt (steps 1–2). The UI sends the image to the ReceiptScanner, which forwards it to the Anthropic AI API for data extraction (steps 3–4). The AI returns the store name, amount, and date, which auto-fill the form fields (steps 5–6).
Next, the UI queries the StorePolicy class with the detected store and category to get community-based warranty suggestions (steps 7–8). The suggestions are displayed to the user, who reviews all fields and confirms (step 9).
When the user clicks Save (step 10), the Purchase class validates the input, saves the data to Storage, updates the community data with the new warranty information, calculates the warranty end date, and requests the Alert class to schedule notifications at 90, 60, 30, and 7 days before expiry (steps 11–20). Finally, a success message is displayed to the user (steps 21–22).
 

9. Future Enhancements
While the current version of Sanad delivers a comprehensive set of features, two enhancements are planned for future iterations:
SMS Auto-Logging: When users make purchases with their bank cards, they receive SMS notifications containing the amount, store name, and date. A future mobile version of Sanad could read these incoming SMS messages, detect bank transaction patterns, and automatically create purchase entries without any manual input. This would require a native Android app with SMS reading permissions, as well as custom parsers for different Saudi banks (Al Rajhi, Al Ahli, Riyad Bank, STC Pay, etc.) since each bank formats its messages differently. This feature was not included in the current version because Google Play restricts SMS access to apps whose core functionality depends on it.
Cloud Database: The current prototype uses localStorage for data persistence and pre-loaded seed data for community suggestions. A production version would migrate to a cloud database such as Firebase or MongoDB to enable real multi-user data sharinanadg, cross-device synchronization, automatic backups, and genuine crowdsourced community suggestions powered by real user contributions rather than simulated data.
