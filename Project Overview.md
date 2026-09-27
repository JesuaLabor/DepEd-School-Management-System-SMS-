# Project Overview: DepEd School Management System (SMS)

### For Junior High School (JHS) and Senior High School (SHS)

---

## 1. Introduction

The **DepEd School Management System (SMS)** is a proposed digital platform designed to streamline and centralize the administrative, academic, and communication processes of public and private secondary schools under the Department of Education (DepEd), covering both **Junior High School (Grades 7–10)** and  **Senior High School (Grades 11–12)** .

The system aims to replace fragmented, paper-based, or spreadsheet-driven workflows with a unified digital solution that supports DepEd's existing frameworks such as the  **Learner Information System (LIS)** ,  **Enhanced Basic Education Information System (EBEIS)** , and the  **K to 12 curriculum** , while remaining lightweight and accessible for schools with limited resources or connectivity.

---

## 2. Problem Statement

Many public schools, especially in rural or resource-limited areas, still rely on:

* Manual encoding of grades and attendance
* Paper-based enrollment and Form 137/138 processing
* Disconnected communication between teachers, parents, and administrators
* Difficulty tracking SHS strand/track assignments and subject loads
* Time-consuming generation of reports for DepEd compliance (SF1, SF2, SF9, SF10)

This leads to administrative bottlenecks, data inconsistency, and delays in decision-making at the school and division level.

---

## 3. Objectives

1. Digitize and centralize student records from Grade 7 to Grade 12.
2. Automate grade computation, attendance tracking, and report card (SF9) generation.
3. Support SHS-specific needs: strand/track management, subject offerings per semester.
4. Improve communication between teachers, students, guardians, and school administrators.
5. Generate DepEd-compliant reports (School Forms) with minimal manual effort.
6. Provide role-based access for Admin, Registrar, Teachers, Students, and Parents/Guardians.
7. Ensure the system works reliably even with limited or intermittent internet access.

---

## 4. Scope

### In Scope

* Student enrollment and records management (JHS & SHS)
* Class and section management, including SHS strands/tracks
* Attendance monitoring (daily/per subject)
* Grade encoding, computation, and report card generation
* Teacher's class/subject load management
* Basic communication module (announcements, messages)
* School Forms generation aligned with DepEd formats (SF1, SF2, SF9, SF10)
* User roles: Super Admin, School Admin/Registrar, Teacher, Student, Parent/Guardian

### Out of Scope (Phase 1)

* Direct integration with DepEd's national LIS/EBEIS database (may be a future API integration)
* Payroll and HR management for teachers/staff
* Learning Management System (LMS) features like online modules or quizzes (potential future module)

---

## 5. Target Users

| Role                             | Description                                                     |
| -------------------------------- | --------------------------------------------------------------- |
| **Super Admin**            | Manages the overall system, school accounts, and configurations |
| **School Admin/Registrar** | Handles enrollment, section assignment, and report generation   |
| **Teacher**                | Encodes grades and attendance, manages class records            |
| **Student**                | Views grades, attendance, schedule, and announcements           |
| **Parent/Guardian**        | Monitors child's academic progress and receives announcements   |

---

## 6. Key Features

1. **Enrollment Management** – Online or assisted enrollment for new and returning students, with automatic promotion from Grade 10 to Grade 11 strand selection.
2. **Student Information System (SIS)** – Centralized learner profile (LRN, personal info, guardian info, academic history).
3. **Grading & Report Cards** – Configurable grading per DepEd's K-12 grading system, auto-generated SF9 (report card) and SF10 (permanent record).
4. **Attendance Tracking** – Daily and per-subject attendance with automated absence alerts to guardians.
5. **SHS Strand & Track Management** – Handles Academic, TVL, Sports, and Arts & Design tracks, and subject offerings per semester.
6. **Class Scheduling** – Section and subject schedule builder for teachers and students.
7. **Communication Module** – Announcements, SMS/email notifications, and basic messaging.
8. **Reports & Analytics Dashboard** – School-level insights (enrollment trends, performance, attendance rates) for admins.
9. **Offline-friendly Design** – Local data caching/sync for areas with unstable internet.

---

## 7. Suggested Technology Stack

| Layer                                   | Suggested Technology                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Frontend (Web)                          | React.js / Next.js                                                                                         |
| Mobile (optional, for parents/students) | React Native or Flutter                                                                                    |
| Backend                                 | Django REST Framework or Node.js (Express)                                                                 |
| Database                                | PostgreSQL or MySQL                                                                                        |
| Authentication                          | JWT-based, role-based access control (RBAC)                                                                |
| Hosting                                 | Cloud-based (e.g., a Philippine-based or regional data center for compliance) with offline sync capability |
| Reporting                               | PDF generation library for SF9/SF10 forms                                                                  |

*(This can be adjusted based on your team's existing stack and preferences.)*

---

## 8. High-Level Implementation Phases

| Phase                                      | Focus                                                                    | Estimated Duration |
| ------------------------------------------ | ------------------------------------------------------------------------ | ------------------ |
| **Phase 1: Discovery & Planning**    | Requirements gathering with a pilot school, DepEd form compliance review | 3–4 weeks         |
| **Phase 2: Core Development**        | Enrollment, SIS, grading, attendance modules                             | 8–12 weeks        |
| **Phase 3: SHS Module**              | Strand/track management, semester-based subjects                         | 4–6 weeks         |
| **Phase 4: Reports & Communication** | School Forms generation, notifications                                   | 4–6 weeks         |
| **Phase 5: Pilot Testing**           | Deploy to 1–2 partner schools, gather feedback                          | 4–8 weeks         |
| **Phase 6: Refinement & Rollout**    | Bug fixes, scaling, onboarding more schools                              | Ongoing            |

---

## 9. Expected Benefits

* **For Schools:** Reduced administrative workload, faster report generation, fewer data entry errors.
* **For Teachers:** Less time on manual encoding, more time for instruction.
* **For Students/Parents:** Real-time access to grades, attendance, and announcements.
* **For DepEd Compliance:** Standardized, audit-ready School Forms.

---

## 10. Challenges & Risks

* **Connectivity limitations** in rural schools — mitigated by offline-first design.
* **Data privacy compliance** (Data Privacy Act of 2012) — requires secure handling of minors' data.
* **User adoption** — teachers and admins may need training and change-management support.
* **Alignment with DepEd standards** — School Forms and grading rules must be kept updated with DepEd memoranda.

---

## 11. Next Steps

1. Identify a pilot school (public or private) to validate requirements.
2. Finalize the MVP feature set (likely: enrollment, SIS, grading, attendance, SF9 generation).
3. Design the database schema around DepEd's School Forms structure.
4. Build a clickable prototype/wireframe for stakeholder feedback before full development.
