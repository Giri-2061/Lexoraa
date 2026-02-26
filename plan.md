1. Subscription-Tiered Access Control
To enforce the limits shown in the tier pricing model, the system will implement a validation layer within the classroom membership logic.

Tier Enforcement: When a student attempts to join a classroom via a code, the system will check the consultancy's tier (Basic, Professional, or Enterprise) against the current count of students in the classroom_memberships table.

Tier Data Structure:
| Tier | Max Students | Feature Set |
| :--- | :--- | :--- |
| Basic | 5 | Standard Mock Tests + AI Evaluation |
| Professional | 15 | Enhanced Stats + Detailed Feedback |
| Enterprise | 100 | Full Analytics + Priority Support |

2. Dual-Path Student Onboarding
The system supports two methods to ensure flexibility for different consultancy workflows:

Method A: Teacher Distribution: Teachers can manually add students via email. This triggers an invite or automatically links an existing student profile to the classroom.

Method B: Classroom Code (Self-Enrollment): Students enter a unique "Classroom Code" in their dashboard. The system validates the code, checks the consultancy's student limit, and grants access to premium features upon successful joining.

3. Management & Analytics Dashboard
Teachers/Consultancy owners require a high-level view of their "tenant" to justify the subscription cost:

Student List: A searchable directory of all students currently enrolled in their classrooms.

Aggregate Stats: Average band scores across Listening, Reading, Writing, and Speaking for the entire consultancy.

Progress Tracking: Visualized trends showing student improvement over time, allowing teachers to identify students who need extra help.

4. Technical Database Implementation
The consultancies table will be updated to include a tier field. PostgreSQL functions will handle the logic to prevent "Over-subscription" at the database level.




## prompt
Update the Supabase schema and React hooks to support a tiered multi-tenancy distribution system.

Database: Add a tier column (enum: 'basic', 'professional', 'enterprise') to the consultancies table.

Logic: Create a PostgreSQL function check_student_limit() that triggers before a new record is inserted into classroom_memberships. It should verify if the number of students already in the consultancy's classrooms exceeds the limits: Basic (5), Professional (15), or Enterprise (100).

React Hook: Update useClassroom.tsx to include an enrollStudentByCode function. This function must take a class_code, find the corresponding classroom_id, and attempt to insert the current user.id into classroom_memberships, handling the 'Limit Reached' error from the database.

Dashboard: Create a ConsultancyStats component for users with the 'consultancy_owner' role that calculates the average band_score from test_results for all students linked via classroom_memberships.