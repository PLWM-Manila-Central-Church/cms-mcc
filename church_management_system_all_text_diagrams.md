<!-- Converted from the uploaded DOCX. All diagrams and visual figures have been rewritten as text-based Markdown/ASCII content so the file is self-contained. -->

**A WEB-BASED CHURCH MANAGEMENT SYSTEM OF PHILIPPINE LIFE WORD MISSION – MANILA CENTRAL CHURCH










**

Undergraduate Capstone Project
Submitted to the Faculty of the
Department of Computer Studies
Cavite State University – Bacoor City Campus
Bacoor, Cavite

In partial fulfillment
of the requirements for the degree of
Bachelor of Science in Information Technology

**PAOLO P. DELIMIOS**
**CHRISTIAN NEIL DERIPAS**
**JOHN ISID P. FERRERA**
May 2026

**TABLE OF CONTENTS
**

[**INTRODUCTION 3**](#introduction)

> [Objective of the Study 6](#objective-of-the-study)
>
> [Scope and Limitations of the Study 11](#scope-and-limitations-of-the-study)
>
> [Conceptual Framework of the Study 13](#conceptual-framework-of-the-study)
>
> [Definition of Terms 16](#definition-of-terms)

[**REVIEW OF RELATED LITERATURE 17**](#review-of-related-literature)

> [Related Local Literature 18](#related-local-literature)
>
> [Related Foreign Literature 21](#related-foreign-literature)
>
> [Related Local Studies 23](#related-local-studies)
>
> [Related Foreign Studies 26](#related-foreign-studies)
>
> [Technical Background 28](#technical-background)

[**METHODOLOGY 32**](#methodology)

> [Design of Software, Systems, Product, and Processes 32](#design-of-software-systems-product-and-processes)
>
> [System Development 48](#system-development)
>
> [System Evaluation 52](#system-evaluation)
>
> [Data Analysis Plan 53](#data-analysis-plan)
>
> [Implementation Plan 56](#implementation-plan)

[**APPENDICES 60**](#appendices)

> [Appendix Figure 1. Initial interview with the client 61](#section-16)
>
> [Appendix Figure 2. Follow-up interview with the client 61](#appendix-figure-2.-follow-up-interview-with-the-client)

**A WEB-BASED CHURCH MANAGEMENT SYSTEM OF PHILIPPINE LIFE WORD MISSION MANILA CENTRAL CHURCH



Paolo P. Delimios
Christian Neil Deripas
John Isid P. Ferrera**

An undergraduate capstone project manuscript submitted to the faculty of the Department of Computer Studies, Cavite State University, Bacoor City Campus, City of Bacoor, Cavite, In partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology. Contribution No.\_\_\_\_\_\_. Prepared under the supervision of Steffanie Maglasang–Bato, MIT.

# INTRODUCTION

In today’s rapidly evolving environment, organizations are required to adopt efficient and structured systems to support their operations and service delivery. As institutions continue to grow and expand their scope of activities, the need for effective administrative management becomes increasingly essential. This is particularly evident in organizations with large and continuously increasing membership bases, where the coordination of records, events, and resources plays a vital role in sustaining operations.

Despite technological advancements, many institutions still rely on administrative methods that are no longer adequate for contemporary demands. Organizations that depend on manual and semi-digital processes often experience significant operational challenges that accumulate over time. Common administrative functions—such as attendance monitoring, member profiling, event scheduling, financial recording, and inventory tracking—are frequently managed through paper-based records and standalone spreadsheet files. These approaches have been identified as inefficient, as they tend to slow down processes, increase the likelihood of human error, and limit the organization’s ability to scale effectively.

Moreover, attendance recording through manual encoding requires considerable time and effort, often involving lengthy verification processes. The continued use of paper-based systems negatively affects the quality, speed, and accuracy of outputs. In addition, storing information across multiple files creates barriers to efficient data retrieval and decision-making. Centralized digital platforms, on the other hand, provide integrated access to information and enable real-time insights, allowing for more informed and timely decisions. The adoption of digital solutions enhances operational capacity while allowing leaders to focus more on their core responsibilities.

In response to these challenges, this study proposes the design and development of a web-based management system. The proposed system integrates key functionalities, including barcode-based attendance tracking, member profile management, online pre-registration, event scheduling, notification tools, financial recording, inventory monitoring, and a digital records archive into a unified platform. Through this approach, the study aims to improve administrative efficiency, streamline processes, and support the overall effectiveness of organizational operations.

## Project Context
Organizations that rely on traditional administrative approaches often encounter persistent operational difficulties that hinder efficiency and growth. In the context of church management, these challenges become more evident due to the need to coordinate various activities involving multiple stakeholders, including leaders, volunteers, and members.

One of the primary concerns is the continued reliance on manual attendance recording. The use of paper-based methods makes it difficult to accurately monitor participation, generate timely reports, and analyze attendance trends. This process is not only time-consuming but also prone to human error, which affects the reliability of recorded data.

Another significant issue lies in the management of member information. Data stored across multiple and unintegrated files results in inconsistencies, redundancy, and potential data loss. This fragmented approach complicates data retrieval and raises concerns regarding data security and confidentiality. Without a centralized system, maintaining accurate and updated member records becomes increasingly difficult.

Event planning and coordination also present challenges due to the absence of an integrated system. Manual processes require extensive communication among organizers, which may lead to delays, scheduling conflicts, and miscommunication. As a result, the overall efficiency in organizing church activities is reduced.

Communication with members remains limited and inconsistent, as announcements are primarily delivered during gatherings or through separate messaging platforms. This approach does not guarantee that all members receive important updates, leading to gaps in information dissemination and reduced engagement.

Financial management is another area affected by manual processes. The recording of tithes, offerings, and donations using traditional methods increases the likelihood of errors and discrepancies. This lack of automation and verification mechanisms may impact the accuracy and transparency of financial records.

In addition, inventory tracking is conducted without a centralized system, making it difficult to monitor available resources effectively. This often leads to mismanagement, duplication of records, and outdated information, which can affect the planning and execution of church activities.

Overall, the absence of a unified and real-time information system results in inefficient workflows and delayed decision-making. Instead of being proactive, administrative actions are often reactive due to limited access to accurate and timely data. These challenges emphasize the need for a comprehensive solution that can streamline operations, improve data management, and support more effective decision-making processes.

## Objective of the Study

The study aims to develop a Web-Based Church Management System for Philippine Life Word Mission – Manila Central Church that improves efficiency, accuracy, and accessibility in managing church records and administrative processes.

Specifically, it aims to:

1. Design and develop a web-based system that:

a. provides a barcode-based attendance monitoring module;

b\. offers event scheduling and notification features;

c\. maintains a centralized database for member information,
financial records, and inventory;

d\. automates reporting of attendance, contributions, and
administrative data;

> e\. integrates role-based access control for secure and
> organized management.

2\. Develop the application using the following technologies:

a\. Node.js for backend development and REST API handling;

b\. React.js for building the interactive and responsive frontend
interface;

c\. MySQL as the database management system for
centralized data storage;

d\. Role-Based Access Control (RBAC) for secure user

access.

3. Test the system through unit and system testing to ensure functionality and
reliability.

4\. Evaluate the system using an adapted ISO 25010-based evaluation instrument.

5\. Prepare an implementation plan for deployment within the church organization.

## Purpose and Description
The research study aims to develop a web-based church management system for Philippine Life Word Mission – Manila Central Church. The platform is designed to address the inefficiencies of manual administrative processes by integrating attendance monitoring, member profiling, event scheduling, financial documentation, and inventory tracking into a centralized digital system. The church currently relies on fragmented and paper-based methods, which often result in scattered records, delayed retrieval of information, and inconsistencies that affect the accuracy and efficiency of operations.

The system includes features such as barcode-based attendance monitoring, centralized member profile management, online pre-registration, event scheduling with notification tools, financial management, inventory monitoring, automated reporting, and a digital records archive. These functions ensure that church data is properly recorded, organized, and accessible to authorized users. The platform also supports better communication between church leaders, staff, and members by providing timely updates and notifications, thereby strengthening engagement and participation.

The project uses digital technology to create three main benefits: improved efficiency, increased transparency, and enhanced decision-making capacity. The study aims to achieve objectives such as streamlining administrative workflows, reducing manual workloads, and fostering stronger community involvement within the church organization. The Manila Central Church, as a growing institution, faces challenges in maintaining accurate records, coordinating events, and disseminating information effectively. The project addresses these challenges by implementing an integrated digital system designed to unify operations and establish a direct line of communication for member engagement.

The platform is designed as a digital tool to bridge critical administrative gaps by merging attendance, membership, financial, and inventory systems into one unified solution. The digital transformation empowers church leaders to respond proactively, allows for data-driven decision-making, and ensures accountability in financial and resource management. The transition to a centralized system is intended to strengthen operational efficiency, enabling the church to sustain its growth through more organized administration and accountable community engagement.

The **Church Leaders and Administrators,** They will benefit from centralized access to records and reports, enabling faster decision-making and improved coordination of church activities.  

**Staff Members and Volunteers,** Automation of routine tasks such as attendance tracking and event scheduling will reduce manual workloads, minimize errors, and allow them to focus on more meaningful responsibilities.   

**Church Members,** They will benefit from clearer communication, timely notifications, and easier participation through online pre-registration, ensuring stronger engagement with church programs.  

**Financial Officers and Record Keepers,** They will gain a more organized and transparent financial recording system, reducing discrepancies and simplifying the generation of financial reports.   

**The Church Organization as a Whole** The institution will achieve increased efficiency, stronger community involvement, and scalable processes that adapt to future growth and evolving needs.

## Time and Place of the Study
The study is conducted at Philippine Life Word Mission – Manila Central Church, located in BF Homes, Parañaque City. This site serves as the primary venue for data gathering, system analysis, and evaluation, ensuring that the system is tailored to the actual workflows and administrative practices of the church. The research was carried out during the academic year 2025–2026 as part of the requirements for the Bachelor of Science in Information Technology program at Cavite State University – Bacoor City Campus.

The project begins with the proposal drafting and defense, where the researchers conceptualize the web-based church management system and gather essential data through interviews and consultations with church leaders, administrators, and staff. These activities allow the identification of existing administrative challenges and guide the system’s features. Supporting documents from these interviews are presented in the appendices to validate the data-gathering process.

The system design phase follows, focusing on the creation of database structures, interface layouts, and module specifications. During this stage, the researchers develop the application framework that integrates attendance monitoring, member profiling, event scheduling, financial documentation, and inventory tracking into a unified platform.

System development is then carried out using modern web technologies, specifically Node.js for backend processing, React.js for frontend responsiveness, and MySQL for centralized data storage. Core functions such as barcode-based attendance, role-based access control, and automated reporting are implemented to establish the foundation of the system.

Once development is completed, the application undergoes testing to verify its operational capacity. Unit testing ensures that individual modules function correctly, while system testing validates the integration of all components. The evaluation process, guided by ISO 25010 standards, measures the system’s functionality, usability, reliability, and security to determine its effectiveness in supporting church operations.

The implementation phase prepares the system for deployment within the church organization. This includes installation procedures, training sessions for administrators and staff, and the distribution of user manuals to ensure smooth adoption. The study manuscript continues to document each research stage until the final oral defense and manuscript review, which will showcase the completed system along with its supporting documentation.

## Scope and Limitations of the Study

The study covers the design and development of a Web-Based Church Management System specifically for Philippine Life Word Mission – Manila Central Church. The system is designed to manage, organize, and maintain church-related information through functional modules such as barcode-based attendance tracking, member profile management, online pre-registration, event management, notification tools, financial management, inventory monitoring, and a digital archive for church records. These modules centralize church data into a structured database to ensure accuracy, consistency, and accessibility across different administrative functions.

The system automates key processes including attendance monitoring, event scheduling, financial documentation, and inventory tracking. It also generates organized reports such as attendance summaries, contribution records, and event participation reports, which support efficient monitoring and decision-making. Church leaders and administrators benefit from tools for managing records and making informed decisions, while church members benefit from improved communication and easier participation in activities. Overall, the church organization gains increased efficiency, accountability, and stronger community engagement.

The system is developed using Node.js, React.js, and MySQL, providing a secure and centralized platform for church personnel to manage operations effectively. A role-based access control mechanism ensures that users only access features appropriate to their roles. Administrators are granted full control of the system, including configuration, user management, and report generation, while church leaders and pastors are provided access to attendance reports, financial summaries, member profiles, and event schedules to support decision-making. Staff and volunteers are authorized to input attendance, update member records, manage event registrations, and track inventory, focusing on operational tasks assigned to them. Members, on the other hand, are able to log attendance through barcode scanning, update their personal profiles, register for events, and view their own contribution history, ensuring active participation in church programs.

The system’s detailed features include barcode-based attendance monitoring, centralized member profile management, online pre-registration for services and events, event scheduling with notification tools, financial management for tithes and offerings, inventory monitoring for church resources, automated reporting for attendance and contributions, a digital records archive, and role-based access control for secure user management.

However, the system is limited to the main branch of Philippine Life Word Mission – Manila Central Church and does not extend to other branches or external church organizations. The financial management module is basic and does not include advanced accounting features such as tax computation, multi-branch integration, or financial forecasting. Likewise, the system does not include payroll processing or advanced human resource management, which may still require manual handling.

## Conceptual Framework of the Study

The study uses the Input–Process–Output (IPO) model to guide the development of the Web-Based Church Management System. This model helps explain how the system was created, starting from the requirements needed for development, moving through the steps taken to build the system, and ending with the final output.

Input Stage. The study considers all the resources needed to develop the system. These include the church's operational needs such as attendance monitoring, member profiling, event scheduling, notifications, financial documentation, inventory tracking, and digital records archiving. The inputs also involve the technical knowledge required for the project, including web development, database design, and user interface design. The tools used—such as Node.js for the backend, React.js for the frontend, MySQL for the database, and other web technologies—are part of the inputs, along with hardware like computers, barcode scanners, and a stable internet connection.

Process Stage. This stage describes the activities carried out to transform inputs into a working system. This includes analyzing the church's needs, documenting system requirements, designing the database and interface, and developing the backend and frontend components. The different modules of the system are then integrated and tested to ensure they function correctly. Role-based access control is also implemented to secure the system. Throughout this stage, improvements are made based on testing and feedback.

Output Stage. This stage results in the completed Web-Based Church Management System. The final system provides a centralized platform that includes barcode-based attendance tracking, member management, online pre-registration, event scheduling, notifications, financial monitoring, inventory management, and digital archiving. By organizing church data and automating key tasks, the system improves efficiency, strengthens communication, and supports the overall operations of Philippine Life Word Mission – Manila Central Church.

**Figure 1. Conceptual Framework of the Web-Based Church Management System**

**Text-Based Diagram: Figure 1 - Conceptual Framework / IPO Model**

```text
+--------------------------------------+     +----------------------------------------+     +--------------------------------------+
| INPUT                                | --> | PROCESS                                | --> | OUTPUT                               |
+--------------------------------------+     +----------------------------------------+     +--------------------------------------+
| Knowledge Requirements               |     | Requirements Analysis                   |     | A WEB-BASED CHURCH MANAGEMENT        |
| - Church administrative workflows     |     | - Interviews and observations with      |     | SYSTEM OF PHILIPPINE LIFE WORD       |
| - Web-based application concepts      |     |   church leaders                        |     | MISSION - MANILA CENTRAL CHURCH      |
| - Backend development using Node.js   |     | - Identification of operational needs   |     |                                      |
| - Database design and normalization   |     | - Feasibility studies                   |     |                                      |
|   using MySQL                         |     | - Requirements documentation            |     |                                      |
| - Frontend development using React.js |     |                                        |     |                                      |
|                                      |     | System Design                           |     |                                      |
| Software Requirements                 |     | - UI/UX design for admin and members    |     |                                      |
| - Node.js backend                     |     | - Database schema design using MySQL    |     |                                      |
| - React.js frontend                   |     | - System architecture using Node.js     |     |                                      |
| - MySQL database                      |     |   and React.js                          |     |                                      |
| - Visual Studio Code                  |     |                                        |     |                                      |
| - Browser testing tools               |     | System Development                      |     |                                      |
|                                      |     | - Backend development using Node.js     |     |                                      |
| Hardware Requirements                 |     | - Frontend development using React.js   |     |                                      |
| - Windows 10/11 computer              |     | - Module integration                    |     |                                      |
| - Quad-core processor or higher       |     | - RBAC implementation                   |     |                                      |
| - Minimum 4 GB RAM                    |     |                                        |     |                                      |
| - 128 GB storage                      |     | System Testing                          |     |                                      |
| - 1080p monitor                       |     | - Unit testing                          |     |                                      |
| - Barcode scanner                     |     | - Integration testing                   |     |                                      |
| - Stable internet connection          |     | - System testing                        |     |                                      |
|                                      |     | - Debugging and refinement              |     |                                      |
|                                      |     |                                        |     |                                      |
|                                      |     | Implementation Plan                     |     |                                      |
|                                      |     | - Deployment at Manila Central Church   |     |                                      |
|                                      |     | - Training for church staff             |     |                                      |
|                                      |     | - System maintenance and updates        |     |                                      |
+--------------------------------------+     +----------------------------------------+     +--------------------------------------+
                                                        |
                                                        v
                                             +---------------------------+
                                             | Evaluation                |
                                             | ISO/IEC 25010             |
                                             +---------------------------+
```


## Definition of Terms

Administrator is the user with full access to the system, responsible for system configuration, data management, and report generation.

Attendance management module refers to the system feature used to record, monitor, and analyze church member attendance during services, fellowships, and other church activities.

Barcode-based attendance refers to the method of attendance recording that uses barcode scanning to automatically register member participation, reducing manual input and errors.

Church inventory module refers to the feature that tracks church-owned items, materials, and supplies to ensure proper monitoring and usage.

Church management system refers to the centralized system that organizes and automates church administrative tasks to improve efficiency, accuracy, and accessibility of church data.

Data security refers to the measures implemented to protect system information from unauthorized access, loss, or misuse.

Digital church records archive module refers to the system component that stores official church records such as meeting minutes, decisions, and resolutions in digital format.

Event management module refers to the module that enables the scheduling, organization, and monitoring of church events and activities.

Financial management module refers to the module that is responsible for recording and managing church finances, including tithes, offerings, donations, and expenses.

Member profile management module refers to the module that stores and manages personal information of church members, including basic details, ministry involvement, and participation records.

Notification tools module refers to the system feature that sends automated messages or alerts, such as announcements and event reminders, through SMS or email.

Online pre-registration module refers to the feature that allows church members to register in advance for services or events to assist in planning and preparation.

Report generation refers to the process of producing summaries and analytical outputs based on stored system data to support decision-making.

User refers to any authorized individual who accesses the system, including church administrators, pastors, leaders, staff, volunteers, or members.

Web-based church management system refers to the software application accessed through a web browser that assists church administrators and leaders in managing church operations such as attendance, member information, events, finances, inventory, and records using internet-connected devices.

# REVIEW OF RELATED LITERATURE
The related literature and studies supporting the development of the Web-Based Church Management System for Philippine Life Word Mission – Manila Central Church are presented in this section. The review includes local and foreign sources published between 2022 and 2025, providing theoretical and empirical foundations related to church information systems, attendance monitoring, event scheduling, financial documentation, inventory tracking, and digital archiving.

## Related Local Literature

**Financial Management Practices in Philippine Churches.** Financial management is a critical component of church administration, particularly in ensuring transparency, accountability, and sustainability of operations. In religious organizations, structured financial systems such as budgeting, internal controls, and monitoring mechanisms play a vital role in maintaining organizational integrity. Churches often handle sensitive financial matters, making the implementation of proper financial governance essential for building trust among members and stakeholders. Effective financial practices also support long-term planning and resource allocation, which are necessary for expanding church programs and services. The researchers found that churches dealing with financial contributions from members must maintain accurate and organized financial records to prevent mismanagement and misuse of funds. Proper financial documentation and monitoring systems also allow church leaders to track income sources, expenses, and allocations effectively. This is particularly important because churches rely heavily on voluntary contributions, making financial trust a critical factor in sustaining member support. Moreover, literature emphasizes that strengthening financial management systems contributes to improved decision-making and overall administrative efficiency in church institutions *(2023)*

**Organizational Structure and Leadership in Philippine Churches.** Organizational structure and leadership systems significantly influence the effectiveness of church operations and personnel performance. A well-defined structure provides clarity in roles, responsibilities, and decision-making processes, which enhances coordination within the organization. Leadership support and institutional policies also shape how church workers deliver services and engage with the community. Furthermore, the presence of structured governance frameworks enables churches to operate more efficiently and respond effectively to organizational challenges. Asuncion also highlighted that strong leadership combined with an effective organizational structure contributes to sustainable church development. Churches with organized systems are better equipped to handle challenges, adapt to changes, and maintain consistent service delivery. This supports the idea that a digital management system should reflect and support organizational structures (Asuncion, 2023)

**Participatory Governance in Church Management.** Participatory governance has emerged as an essential approach in modern church management, emphasizing shared decision-making among leaders, members, and stakeholders. This approach promotes inclusivity, transparency, and collaboration within church organizations, leading to more responsive and adaptive administrative systems. By involving various sectors of the church community, communication is improved and program implementation becomes more effective. Additionally, participatory structures enhance leadership development by encouraging active involvement and accountability among members. Literature highlights that collaborative governance frameworks improve organizational cohesion and effectiveness. This literature supports the integration of communication and collaboration features in church management systems (2023)

**Theological Education and Leadership Development in Churches.** Theological education plays a significant role in shaping both the spiritual and administrative competencies of church leaders. Beyond doctrinal formation, it equips individuals with essential skills in leadership, organizational management, and decision-making. Structured training programs contribute to the development of effective leaders who can manage church operations and guide communities efficiently. In addition, continuous education allows church leaders to adapt to changing societal and organizational environments. As churches face new challenges such as technological advancements and shifting member expectations, leaders must be prepared to respond effectively. Literature indicates that integrating leadership and management principles into theological education enhances governance and mission effectiveness. This supports the need for systems that assist leaders in managing both spiritual and administrative tasks (Santiago, 2023).

**Church Engagement and Member Participation.** Member engagement is a vital factor in sustaining church activities and strengthening organizational impact. Effective communication strategies, leadership practices, and program management significantly influence the level of participation among church members. When organizations implement structured activities and clear management systems, members are more likely to become actively involved in both religious and social initiatives. Furthermore, the study highlighted that engagement fosters a sense of belonging and responsibility among members. When individuals feel connected to the organization, they are more willing to contribute to its mission and activities. Literature suggests that strong organizational practices directly enhance member participation and support the long-term sustainability of church operations (Abun et al., 2023).

## Related Foreign Literature

**Management Information Systems in Organizations.** Management Information Systems (MIS) are essential tools used by organizations to improve decision-making and operational efficiency. According to Laudon and Laudon (2022), MIS integrates data, processes, and technology to support planning, control, and coordination within an organization. These systems enable organizations to collect, store, and analyze data in a structured manner, reducing inefficiencies associated with manual processes. Furthermore, MIS provides real-time access to information, allowing managers to make informed decisions quickly. The use of such systems also improves accuracy, consistency, and communication across departments. As organizations grow, the need for centralized systems becomes more critical to maintain effective operations. This literature is relevant to the present study as a church management system functions as a specialized MIS designed to manage church-related data and activities. (Laudon & Laudon, 2022)

**Digital Transformation in Organizations.** Digital transformation refers to the integration of digital technologies into organizational processes to improve performance and service delivery. According to Vial (2022), digital transformation enhances operational efficiency by automating processes and improving data accessibility. Organizations adopting digital technologies experience better coordination, improved communication, and increased productivity. The literature also highlights that digital systems allow organizations to respond more effectively to changing environments. Furthermore, digital transformation supports innovation and long-term sustainability. However, successful implementation requires proper planning, user acceptance, and technological infrastructure. This is relevant to the present study as churches are increasingly adopting digital systems to improve administrative operations. (Vial, 2022)

**Database Management Systems and Data Handling.** Database Management Systems (DBMS) play a crucial role in managing organizational data efficiently. According to Elmasri and Navathe (2022), DBMS provides mechanisms for storing, retrieving, and managing data in a structured and secure manner. These systems reduce data redundancy and ensure consistency across different organizational processes. Additionally, DBMS enhances data security by implementing access controls and backup mechanisms. Organizations that utilize database systems benefit from faster data retrieval and improved reporting capabilities. The literature emphasizes that centralized databases are essential for organizations dealing with large volumes of information. This is relevant to the present study as church management systems rely heavily on database technologies to manage member and administrative data. (Elmasri & Navathe, 2022)

**Information Systems for Nonprofit Organizations.** Information systems are widely used in nonprofit organizations to improve efficiency and service delivery. According to Hackler and Saxton (2022), nonprofit organizations benefit from digital systems that enhance communication, record management, and reporting processes. These systems help organizations manage resources effectively and improve accountability. The literature also highlights that information systems enable better engagement with stakeholders. Furthermore, digital tools support transparency and data-driven decision-making. The adoption of information systems is essential for nonprofits aiming to remain efficient and sustainable. This is relevant to the present study as churches operate similarly to nonprofit organizations and require efficient management systems. (Hackler & Saxton, 2022)

**Usability and User Acceptance of Information Systems.** System usability and user acceptance are critical factors in the success of any information system. According to Davis (Technology Acceptance Model), users are more likely to adopt systems that are easy to use and perceived as useful. The literature explains that complex systems often lead to resistance and reduced productivity. Furthermore, user training and intuitive system design significantly improve system adoption. Feedback from users is also essential in improving system functionality. Organizations must ensure that systems are designed with the end-user in mind. This is relevant to the present study as a church management system must be user-friendly to ensure effective utilization by church administrators. (Davis, Technology Acceptance Model)

## Related Local Studies

**Web-Based Church Management System with Biometric Attendance Monitoring.** Delos Santos and Ramirez conducted a study in Cebu on a web-based church management system integrated with biometric attendance monitoring. The researchers used system development methodologies to automate attendance tracking and membership management. The system utilized fingerprint recognition to accurately record attendance and store data in a centralized database. The system will replace traditional manual target attendance methods with biometric fingerprint scanning, allowing for real-time analysis and automatic categorization of active and inactive members based on their attendance. Findings indicated that the system significantly improved attendance accuracy and reduced time-consuming manual processes. Additionally, the system enabled efficient report generation and monitoring of member participation. (Delos Santos & Ramirez, 2023)

**Web-Based Church Membership Information System.** Villanueva and Mendoza developed a web-based membership information system to address inefficiencies in church data management. Churches often struggled with outdated records, duplication, and manual processes that hindered effective administration. Their system introduced a centralized database design, enabling administrators to store, update, and retrieve member information with greater accuracy and speed. Administrators were able to retrieve information quickly, reducing delays in operations. The system also minimized errors associated with manual encoding and record-keeping. Beyond basic record-keeping, the system supported activity tracking, membership statistics, and reporting functions, which improved organizational transparency. Evaluation results showed significant improvements in accessibility, data integrity, and decision-making support. Furthermore, the inclusion of reporting tools enhanced organizational transparency. Church leaders could generate reports on membership growth, attendance, and participation, allowing them to make informed decisions. This developmental study highlights the importance of digitizing membership records to strengthen church governance and member engagement.*(Villanueva & Mendoza, 2023)*

**Church Donation Management System.
**Luciano conducted a study on a church donation management system in Nueva Ecija using Agile methodology. The research aimed to address issues related to manual donation tracking and lack of transparency. The system included features such as donor tracking, automated reporting, and financial analytics. Findings revealed that the system improved financial transparency, reduced errors, and enhanced administrative efficiency. Moreover, it increased trust among church members due to accurate and accessible financial records. Overall, the research demonstrates how integrating data-driven solutions in church management can modernize operations and support better governance practices. (Luciano, 2023)

**Modified Mobile Church Application for Filipino Catholics.
**Serrano et al. conducted a study on the development of a modified mobile church application designed specifically for Filipino Catholics. The researchers identified that despite the strong religious presence in the Philippines, there is a limited number of mobile applications tailored for church use. The study aimed to enhance an existing application called “The Church” app by adding features that cater to the needs of Filipino churchgoers. The researchers utilized a prototype-based development approach and gathered data through surveys to evaluate user feedback and system usability. Findings showed that the improved application addressed the lack of localized church applications and provided features that better support communication, engagement, and accessibility for church members. Furthermore, the study emphasized the importance of digital transformation in religious institutions, particularly in engaging younger generations who are more inclined toward mobile technology. By addressing the gap in localized applications, the research contributes to the growing body of knowledge on how mobile platforms can be leveraged to strengthen community participation and religious engagement in culturally specific contexts. (Serrano et al., 2023)

**Online Scheduling System with SMS Notification and QR Code Recognition.
**Aguilar developed an integrated online scheduling system for church services incorporating SMS notifications and QR code recognition. The study used a quantitative descriptive research design to evaluate system acceptability based on functionality, reliability, usability, and efficiency. The system allowed churchgoers to schedule visits and receive notifications, while QR codes were used for attendance verification. Results indicated high user acceptance and improved convenience in accessing church services. The system also enhanced operational efficiency during high-demand periods such as the pandemic. Overall, it illustrates how combining web-based systems, mobile communication, and QR technologies can enhance service delivery in religious institutions. It reinforces the role of digital solutions in improving user experience, operational management, and public safety in community-based environments. (Aguilar, 2023)

## Related Foreign Studies

**Web-Based Information System for Church Congregations.** A study conducted by Wiratama and Desanti focused on the design and development of a web-based information system for church congregations. The researchers applied the Web Development Life Cycle (WDLC) methodology to address challenges related to fragmented data management and inefficient communication processes. The system was designed to centralize member records, church activities, and administrative functions into a single digital platform. Results of the study indicated that the system significantly improved data organization, accessibility, and communication between church administrators and members. Furthermore, the centralized platform enabled faster data retrieval and more efficient reporting processes, which are essential for effective church management. (Wiratama & Desanti, 2022)

**Web-Based Church Information Management System.** Adeoye and Imuetinyan developed a web-based church information management system aimed at improving administrative efficiency. The study utilized a system development approach to replace manual record-keeping processes with a centralized digital database. The system included modules for membership management, financial tracking, and event scheduling. Findings revealed that the implementation reduced administrative workload, minimized data redundancy, and improved accuracy in record management. Additionally, the system enhanced decision-making by providing real-time access to organized and reliable data. (Adeoye & Imuetinyan, 2022)

**Web and Mobile-Based Church Management System.** A study presented by the IEOM Society explored the development of an integrated web and mobile-based church management system. The research employed a system development methodology to create a platform that combines membership management, attendance monitoring, communication tools, and financial tracking. The results demonstrated that the system improved operational efficiency and strengthened engagement between church leaders and members. Moreover, the integration of mobile access increased system usability and accessibility, allowing users to interact with church services in real time. (IEOM Society, 2022)

**Church Management Information System of Syaloom Imandi Bolaang Mongondow.** Arunda developed a church management information system for GMIBM Syaloom Imandi Church to address inefficiencies caused by manual record-keeping processes. The study identified issues such as difficulty in managing congregational data, worship schedules, inventory, and church programs due to reliance on physical records. The researchers applied the Spiral Model in system development and utilized PHP and MySQL technologies to implement the web-based system. The developed system includes modules for church information, organizational structure, attendance, offerings, inventory, and announcements, all accessible through an online platform. Results indicated that the system significantly improved data accessibility, communication, and administrative efficiency, enabling the church secretary to manage and disseminate information more effectively. *(Arunda, 2022)*

**Ubiquitous Real-Time Church Management System.** Raiyetunbi developed a ubiquitous real-time church management system designed to handle complex church operations. The study used a web-based system architecture to centralize data related to membership, roles, attendance, and financial activities. The research emphasized the need for real-time data processing and accessibility to improve decision-making. Results showed that the system enhanced data accuracy, improved reporting capabilities, and streamlined administrative processes. The implementation also enabled better coordination among church departments through a unified data system. (Raiyetunbi, 2022)

## Technical Background

The Web‑Based Church Management System is designed using a modern client–server architecture to support efficient church operations. The frontend is developed in React.js, providing a responsive and interactive interface for users. The backend utilizes Node.js, which enables asynchronous, event‑driven processing suitable for handling multiple requests simultaneously.

For data management, the system employs MySQL, a relational database management system that ensures secure and structured storage of membership records, financial transactions, and event details. To maintain confidentiality and accountability, the system integrates Role‑Based Access Control (RBAC), restricting access according to user roles such as administrators, staff, and members.

The development process follows the Agile methodology (2026), emphasizing iterative cycles of planning, design, development, testing, deployment, and review. This approach allows continuous refinement based on stakeholder feedback. System evaluation will be guided by the ISO/IEC 25010 software quality model, which provides standardized criteria such as functionality, usability, reliability, efficiency, and security.

## Synthesis
The reviewed literature and studies collectively highlight the growing importance of digital transformation in church administration, particularly in the Philippine context. Local sources emphasize the need for structured financial management, participatory governance, and leadership development as foundations for sustainable church operations. For instance, Arcena et al. (2024) underscored that financial transparency and accurate documentation are vital in maintaining trust among members, while Asuncion (2024) and Lunaa & Ingles (2024) pointed out that organizational structure and participatory governance strengthen coordination and inclusivity within church institutions. These findings align with Santiago (2023) and Abun et al. (2023), who stressed that theological education and member engagement are crucial in shaping effective leaders and fostering active participation. Together, these local perspectives establish that church management systems must not only digitize records but also reinforce accountability, collaboration, and engagement.

Foreign literature complements these insights by situating church management systems within broader organizational and technological frameworks. Laudon and Laudon (2022) described Management Information Systems (MIS) as essential for improving decision-making and efficiency, while Vial (2022) emphasized digital transformation as a driver of innovation and sustainability. Similarly, Elmasri and Navathe (2022) highlighted the role of database management systems in ensuring data integrity and security, and Hackler & Saxton (2022) demonstrated how nonprofit organizations benefit from digital tools that enhance accountability and stakeholder engagement. Davis’ Technology Acceptance Model further reinforces that usability and user acceptance are critical for successful system adoption. These foreign perspectives validate the relevance of applying MIS principles and digital transformation strategies to church contexts, ensuring that systems are not only technically sound but also user-centered.

The reviewed local studies provide concrete examples of how Philippine churches are already experimenting with digital solutions. Delos Santos & Ramirez (2023) demonstrated the effectiveness of biometric attendance monitoring, while Villanueva & Mendoza (2023) showed how centralized membership databases improve transparency and decision-making. Luciano (2025) highlighted donation management systems as tools for financial accountability, and Serrano et al. (2024) illustrated the potential of mobile applications in engaging Filipino Catholics. Aguilar et al. (2024) further showcased how online scheduling systems with SMS and QR integration enhance convenience and safety. These studies collectively prove that digital systems can modernize church operations, reduce inefficiencies, and strengthen member trust.

Foreign studies echo these findings by presenting similar innovations in other contexts. Wiratama & Desanti (2022) and Adeoye & Imuetinyan (2024) demonstrated how web-based systems centralize church data and improve communication, while the IEOM Society (2024) highlighted the benefits of integrating mobile platforms for accessibility. Arundaa et al. (2025) and Raiyetunbi et al. (2022) reinforced the importance of real-time data processing and comprehensive modules for attendance, inventory, and financial tracking. These foreign studies confirm that the challenges faced by Philippine churches—manual processes, fragmented records, and limited communication—are shared globally, and that web-based solutions are effective responses.

In synthesis, both local and foreign literature converge on the idea that church management systems must integrate financial transparency, organizational efficiency, participatory governance, and technological innovation. Local studies provide contextual evidence of the Philippine church experience, while foreign studies offer theoretical and technical frameworks that validate the adoption of MIS, DBMS, and digital transformation principles. Together, they established a strong foundation for the development of the Web-Based Church Management System for Philippine Life Word Mission – Manila Central Church, ensuring that the system is not only technologically robust but also responsive to the organizational, cultural, and spiritual needs of its community.

# METHODOLOGY

This chapter presents the design, development, testing, evaluation, and implementation plan of the Web-Based Church Management System. It explains how the system was conceptualized, structured, and validated to meet the needs of church administrators and members.

## Design of Software, Systems, Product, and Processes

The Web-Based Church Management System functions as a centralized platform designed to automate core church operations such as member registration, attendance monitoring, event scheduling, financial management, inventory tracking, communication, and reporting. It was conceptualized to address the administrative challenges faced by Philippine Life Word Mission – Manila Central Church, ensuring that both leaders and members benefit from streamlined processes and improved accessibility of information.

Administrators, pastors, finance teams, registration staff, and group leaders utilize the system to manage responsibilities more efficiently, while church members are provided with features that allow them to stay informed, register for events, and monitor their participation in church activities. The system integrates multiple modules that collectively support the church’s operational needs, ensuring that data is processed accurately and securely.

**Figure 2. Context Diagram of the Web-Based Church Management System**

**Text-Based Diagram: Figure 2 - Context Diagram**

```text
                    +------------------------------------------------+
                    |                                                |
                    |      WEB-BASED CHURCH MANAGEMENT SYSTEM        |
                    |                                                |
                    +------------------------------------------------+
                      ^       ^       ^        ^        ^        ^
                      |       |       |        |        |        |
                      |       |       |        |        |        +----------------------+
                      |       |       |        |        |                               |
                      |       |       |        |        v                               v
+-----------------------------+   +----------------+   +----------------+      +----------------------+
| ADMINISTRATORS              |   | REPORT FILES   |   | CHURCH         |      | CHURCH MEMBERS       |
+-----------------------------+   +----------------+   | DATABASE       |      +----------------------+
| 1.1 Attendance Data         |   | 3.1 Attendance |   +----------------+      | 2.1 Update Profile   |
| 1.2 Financial Records       |   |     Reports    |                           | 2.2 Register Event   |
| 1.3 Event Data              |   | 3.2 Financial  |                           | 2.3 Confirm          |
| 1.4 Inventory Information   |   |     Statement  |                           |     Participation    |
+-----------------------------+   +----------------+                           | 2.4 Contribution     |
        |                                ^                                     |     Records          |
        |                                |                                     | 2.5 Inventory Info   |
        +---------- inputs --------------+                                     +----------------------+
                                          \                                           |
                                           \                                          v
                                            +----------------------+       +----------------------+
                                            | Contribution Records |       | Event Notifications  |
                                            +----------------------+       +----------------------+
                                                                            ^
                                                                            |
                                                                    +------------------+
                                                                    | Activity Updates |
                                                                    +------------------+
```


Figure 2 illustrates the context diagram of the Web-Based Church Management System, identifying two primary users: administrators and church members. Each member is provided with a personal account that enables them to update their profile, register for events, confirm participation, and record contributions. These actions trigger processes such as data validation, event coordination, and financial tracking, which generate outputs including event notifications, activity updates, and contribution records. Administrators, on the other hand, manage backend operations by inputting attendance logs, financial records, event data, and inventory information. The system processes these inputs to produce outputs such as attendance reports, financial statements, inventory summaries, and event notifications disseminated to members.

**Figure 3. HIPO Diagram of the** **Web-Based Church Management System

**

**Text-Based Diagram: Figure 3 - HIPO Diagram**

```text
                                  +-------------------------------------------+
                                  | 1.0 Web-Based Church Management System    |
                                  +-------------------------------------------+
                                                      |
              +---------------------------------------+---------------------------------------+
              |                                       |                                       |
              v                                       v                                       v
+-------------------------------+       +--------------------------------+       +--------------------------------+
| 2.0 Attendance Management     |       | 3.0 Member Information System  |       | 4.0 Event & Financial          |
+-------------------------------+       +--------------------------------+       |     Management                 |
| 2.1 Record Attendance         |       | 3.1 Manage Member Records      |       +--------------------------------+
| 2.2 View Attendance Reports   |       | 3.2 Update Member Info         |       | 4.1 Plan Events                |
| 2.3 Attendance Analysis       |       | 3.3 Search & Retrieve Data     |       | 4.2 Track Contributions        |
+-------------------------------+       +--------------------------------+       | 4.3 Financial Reports          |
                                                                                 +--------------------------------+
```


The Hierarchy Input–Process–Output (HIPO) diagram provides a systematic representation of the Web-Based Church Management System’s functional architecture. It serves as a bridge between the conceptual framework and the detailed problem analysis, offering a structured view of how the system’s major modules and submodules interact to achieve the objectives identified during the planning and analysis phases.

This diagram decomposes the system into three primary modules: Attendance Management, Member Information Management, and Event and Financial Management. Each module is further divided into sub-functions that define specific inputs, processes, and outputs. For example, Attendance Management covers recording, reporting, and analyzing participation; Member Information Management focuses on storing, updating, and retrieving member records; while Event and Financial Management addresses planning activities, tracking contributions, and generating financial reports.

By clarifying the logical flow of operations, the HIPO diagram ensures that every function is aligned with the system’s goals of efficiency, accuracy, and transparency. It also supports the Agile methodology by enabling iterative refinement of each module, ensuring adaptability to user feedback and evolving requirements. In this way, the HIPO diagram not only illustrates the system’s structure but also reinforces its role as a foundation for coding, testing, and deployment.

**Figure 4. Level 1 Data Flow Diagram of the Web-Based Church Management System**

**Text-Based Diagram: Figure 4 - Level 1 Data Flow Diagram**

```text
+---------------------+                                      +------------------------+
| ADMINISTRATORS      |                                      | CHURCH MEMBERS         |
+---------------------+                                      +------------------------+
| 1.0 Manage          | ---- attendance data --------------> | 5.0 Update Profile     |
|     Attendance      |                                      | 6.0 Register Events    |
| 2.0 Manage          | ---- financial records ------------> | 7.0 Confirm            |
|     Financial       |                                      |     Participation      |
| 3.0 Manage Event    | ---- event data -------------------> | 8.0 Submit             |
|     Data            |                                      |     Contributions      |
| 4.0 Update          | ---- inventory data -------------->  +------------------------+
|     Inventory       |                                                |
+---------------------+                                                |
        |                                                              v
        v                                                     +----------------------+
+---------------------------+         +--------------------+   | Church Database      |
| Attendance Management     | <-----> | Report & Data      | <-+----------------------+
+---------------------------+         | Generation         |           ^
        |                             +--------------------+           |
        v                                      ^                       |
+---------------------------+                  |                       |
| Event & Financial         | -----------------+                       |
| Management                |                                          |
+---------------------------+                                          |
        |                                                              |
        v                                                              |
+---------------------------+                                          |
| Inventory Management      | -----------------------------------------+
+---------------------------+
        |
        v
+---------------------------+
| Notification &            |
| Communication             |
+---------------------------+
```


Figure 4 illustrates the Level 1 Data Flow Diagram, showing how members and administrators interact with the system. Members authenticate through login credentials, then update profiles, record attendance, submit contributions, and register for events. Administrators input attendance logs, financial records, event schedules, and inventory data. The system consolidates these into outputs such as attendance summaries, contribution histories, and event participation details.

At the core, the “Generate Reports” process integrates all data flows, producing comprehensive reports for administrators. This structured flow ensures security, efficiency, and transparency in church operations.

**Figure 5. Level 2 Data Flow Diagram of the Web-Based Church Management System**

**Text-Based Diagram: Figure 5 - Level 2 Data Flow Diagram / Attendance Monitoring**

```text
+----------------+       barcode/member ID       +----------------------+
| Church Member  | ----------------------------> | 1.1 Scan Member ID   |
+----------------+                               +----------------------+
                                                            |
                                                            v
                                                   +----------------------+
                                                   | 1.2 Verify Attendance|
                                                   +----------------------+
                                                     |               |
                                                     | lookup        | verified member
                                                     v               v
                                            +----------------+   +----------------------+
                                            | Member Records |   | 1.3 Record Attendance|
                                            +----------------+   +----------------------+
                                                                        |
                                                                        v
                                                              +----------------------+
                                                              | Attendance Database  |
                                                              +----------------------+
                                                                        |
                                                                        v
                                                              +----------------------+
                                                              | Attendance Reports   |
                                                              +----------------------+
                                                                        |
                                                                        v
                                                              +----------------------+
                                                              | Administrators       |
                                                              +----------------------+
```


Figure 5 presents the Attendance Monitoring process of the Web-Based Church Management System, showing how member participation is tracked in an automated and reliable way. When members arrive, they scan their assigned barcodes, and the system immediately validates their identification against stored records. Once verified, the attendance is recorded in the database, ensuring that each entry is accurate and securely stored.

Every successful scan updates the member’s participation record, which becomes part of the overall attendance history. Administrators can then access these records to generate attendance summaries and participation reports. These outputs help in monitoring engagement levels, evaluating consistency of attendance, and planning future activities.

**Figure 6**. **Level 3 Data Flow Diagram of the Web-Based Church Management System**

**Text-Based Diagram: Figure 6 - Level 3 Data Flow Diagram / Financial Management**

```text
+----------------+   contribution details   +---------------------+   contribution info   +------------------------+
| Church Members | -----------------------> | 1.0 Contribution    | --------------------> | 2.0 Validate           |
|                |                          |     Log             |                       |     Contribution       |
+----------------+                          +---------------------+                       +------------------------+
                                                                                            |             |
                                                                                            | lookup      | approved contribution
                                                                                            v             v
                                                                                     +---------------+  +----------------------+
                                                                                     | Member        |  | 3.0 Categorize      |
                                                                                     | Accounts      |  |     Contribution     |
                                                                                     +---------------+  +----------------------+
                                                                                                                |
                                                                                                                v
+-------------------+       validated transactions       +---------------------------+          +-------------------------+
| Attendance Data   | ---------------------------------> | Financial Records        | <------- | 4.0 Generate Financial |
+-------------------+                                    | Database                 |          |     Report             |
+-------------------+                                    +---------------------------+          +-------------------------+
| Financial Data    |                                                                             | Contribution Summary    |
+-------------------+                                                                             | Expense Report          |
                                                                                                  | Fund Allocation Report  |
                                                                                                  +-------------------------+
                                                                                                                |
                                                                                                                v
                                                                                                      +------------------+
                                                                                                      | Administrators   |
                                                                                                      +------------------+
```


Figure 6 illustrates the Financial Management process at Level 3 of the Web-Based Church Management System. This diagram expands the flow of financial operations into detailed subprocesses, showing how contributions are logged, validated, categorized, and reported.

The process begins when members provide contribution details such as tithes, offerings, and donations. These inputs are captured through 1.0 Contribution Log, where the system records the transaction information. The next subprocess, 2.0 Validate Contribution, ensures that each entry is authentic and consistent with member records stored in the Member Accounts data store. Once validated, the contribution is securely stored in the Financial Records Database.

Validated transactions proceed to 3.0 Categorize Contribution, where the system organizes contributions according to type and purpose, such as general offerings, designated donations, or ministry-specific funds. This categorization supports accurate tracking and allocation of resources.

The final subprocess, 4.0 Generate Financial Reports, compiles the stored and categorized data into structured outputs. Reports include contribution summaries, expense tracking, and fund allocation statements. These are stored in the Financial Reports data store and made available to administrators for monitoring and decision-making. Members, in turn, can access their personal contribution history, reinforcing transparency and trust in financial stewardship.

This Level 3 breakdown demonstrates how the system integrates validation, secure storage, categorization, and reporting to strengthen accountability in church finances. By automating these steps, the system minimizes errors, ensures reliable documentation, and promotes confidence among both administrators and members.

**Figure 7. Use Case Diagram of the Web-Based Church Management System**

**Text-Based Diagram: Figure 7 - Use Case Diagram / Role-Based Access**

```text
System Boundary: Web-Based Church Management System

Administrative Side
+-------------------+       +-----------------------------------------------------------+       +----------------+
| Registration Team | ----> | Access Module, Members Module, Attendance Module,        | <---- | System Admin   |
| Finance Team      | ----> | Cell Group Module, Service Module, Finance Module,       |       +----------------+
|                   |       | Events Module, Inventory Module, Archives Module,        |
|                   |       | Ministry Module, Notifications Module, Audit Logs        |
+-------------------+       +-----------------------------------------------------------+

Community / Ministry Side
+----------+       +-----------------------------------------------------------+       +-------------------+
| Member   | ----> | Access Module, Members Module, Attendance Module,        | <---- | Group Leader      |
| Pastor   | ----> | Cell Group Module, Service Module, Finance Module,       | <---- | Cell Group Leader |
|          |       | Events Module, Inventory Module, Archives Module,        |       +-------------------+
|          |       | Ministry Module, Notifications Module, Audit Logs        |
+----------+       +-----------------------------------------------------------+

Access interpretation:
- System Admin: full control of modules, users, records, reports, and audit logs.
- Registration Team: member registration, profile handling, attendance support, event/service support.
- Finance Team: finance module, contribution records, financial reports, and related records.
- Pastor / Group Leader / Cell Group Leader: ministry, events, attendance visibility, member coordination.
- Member: profile, attendance participation, services/events, notifications, and contribution history.
```


Figure 7 illustrates the use case diagrams that illustrate the role‑based access structure of the Web‑Based Church Management System. Each diagram highlights how specific user groups interact with the system’s core modules to ensure efficient and secure operations.

In the first diagram, the System Admin, Registration Team, and Finance Team are shown as primary actors with direct access to modules such as the Access Module, Members Module, Attendance Module, Finance Module, Events Module, Inventory Module, Archives Module, Ministry Module, Notifications Module, and Audit Logs. This configuration emphasizes administrative control, membership management, financial oversight, and operational monitoring. By assigning these modules to staff roles, the system ensures that sensitive functions such as finance and audit logs remain under authorized personnel, thereby strengthening accountability and transparency.

In the second diagram, the Member, Pastor, Group Leader, and Cell Group Leader are represented as actors connected to the same set of modules. Their access reflects the participatory and community‑oriented functions of the system. Members interact with modules such as Attendance, Service, and Notifications to remain engaged in church activities. Pastors and leaders, meanwhile, utilize modules like Ministry, Cell Group, and Events to coordinate programs, monitor participation, and guide spiritual development. This distribution of access demonstrates how the system supports collaborative governance, enabling leaders and members to contribute actively to church operations while maintaining structured oversight.

Together, the two diagrams provide a comprehensive view of the system’s access hierarchy. Administrative teams are empowered to manage records, finances, and audits, while pastors, leaders, and members are enabled to participate in ministry, services, and group activities.

### Figure 8. Log in and Registration Entity Relationship Diagram of the Web-Based Church Management System

**Text-Based Diagram: Figure 8 - Login and Security ERD**

```text
+--------------------+       1        M       +-----------------------------+
| ROLE               |----------------------->| USER                        |
+--------------------+                        +-----------------------------+
| PK role_id         |                        | PK user_id                  |
| role_name          |                        | email (unique)              |
| description        |                        | password_hash               |
| created_at         |                        | role_id (FK)                |
| updated_at         |                        | member_id (nullable)        |
+--------------------+                        | status (active/inactive)    |
                                                | created_at                  |
                                                | updated_at                  |
                                                +-----------------------------+
                                                         | 1
                            +----------------------------+-----------------------------+
                            |                            |                             |
                            v M                          v M                           v M
+-----------------------------+        +-----------------------------+        +-----------------------------+
| REFRESH_TOKEN               |        | PASSWORD_RESET_TOKEN        |        | AUDIT_LOG                   |
+-----------------------------+        +-----------------------------+        +-----------------------------+
| PK token_id                 |        | PK reset_id                 |        | PK log_id                   |
| user_id (FK)                |        | user_id (FK)                |        | user_id (FK)                |
| token                       |        | token                       |        | action                      |
| expires_at                  |        | expires_at                  |        | timestamp                   |
| revoked (boolean)           |        | used (boolean)              |        | ip_address                  |
| created_at                  |        | created_at                  |        +-----------------------------+
+-----------------------------+        +-----------------------------+
```


Figure 8 is the Login and Security Entity–Relationship Diagram (ERD) illustrates the structural design of the authentication and authorization module within the Web‑Based Church Management System. It defines the entities required to manage user accounts, roles, and system activity logs, ensuring that access to the application is secure and properly controlled. The diagram highlights the User entity as the central component, storing essential credentials such as email, password hash, and account status, while linking each user to a specific role and, when applicable, to a member record.

Supporting this core entity are specialized tables that strengthen the system’s security. The Role entity establishes role‑based access control (RBAC), ensuring that administrators, staff, and members have permissions appropriate to their responsibilities. The Refresh Token and Password Reset Token entities provide mechanisms for secure session management and account recovery, preventing unauthorized access while maintaining usability. Additionally, the Audit Log entity records user actions such as login, logout, and password resets, creating a transparent trail of activity for monitoring and accountability.

This ERD branch demonstrates how the system integrates authentication, authorization, and auditing into a cohesive framework. By structuring these entities and their relationships, the design ensures that user accounts are securely managed, permissions are consistently enforced, and all activities are traceable. This not only protects sensitive member and financial data but also aligns with best practices in information security, making the Login and Security module a critical foundation for the overall system architecture.

**Figure 9. Log in and Registration Entity Relationship Diagram of the Web-Based Church Management System

**

**Text-Based Diagram: Figure 9 - Financial Tracking ERD**

```text
+------------------+      1        M      +------------------+      1        M      +----------------------+
| FUND             |--------------------->| ACCOUNT          |--------------------->| EXPENSE_CATEGORY     |
+------------------+                      +------------------+                      +----------------------+
| PK fund_id       |                      | PK account_id    |                      | PK category_id       |
| fund_name        |                      | account_name     |                      | account_id (FK)      |
| description      |                      | fund_id (FK)     |                      | category_name        |
| created_at       |                      | description      |                      | description          |
| updated_at       |                      | created_at       |                      | created_at           |
+------------------+                      | updated_at       |                      | updated_at           |
        | 1                               +------------------+                      +----------------------+
        | M                                      | 1
        v                                        | M
+------------------+                            v
| INCOME           |                      +------------------+       M       1      +----------------------+
+------------------+                      | EXPENSE          |--------------------->| PAYMENT_METHOD       |
| PK income_id     |                      +------------------+                      +----------------------+
| account_id (FK)  |                      | PK expense_id    |                      | PK payment_method_id |
| date             |                      | account_id (FK)  |                      | method_name          |
| amount           |                      | category_id (FK) |                      | description          |
| description      |                      | date             |                      | created_at           |
| payment_method_id|--------------------->| amount           |                      | updated_at           |
| created_by (FK)  |                      | description      |                      +----------------------+
| created_at       |                      | payment_method_id|
| updated_at       |                      | created_by (FK)  |
+------------------+                      | created_at       |
        | 1                               | updated_at       |
        | M                               +------------------+
        v                                        | 1
+------------------+                            | M
| ATTACHMENT       |<---------------------------+
+------------------+
| PK attachment_id |
| income_id (FK)   |
| expense_id (FK)  |
| file_name        |
| file_path/url    |
| uploaded_by (FK) |
| uploaded_at      |
+------------------+

Legend: PK = Primary Key, FK = Foreign Key, 1 = one, M = many.
```


Figure 9 represents the Financial Tracking Entity–Relationship Diagram (ERD) that defines the structure of the system’s financial management module. It organizes the core entities required to record, categorize, and monitor income and expenses within the church management framework. At the foundation, the Fund entity represents the source of financial resources, while the Account entity links directly to each fund, serving as the repository for transactions. This hierarchical relationship ensures that all financial activities are properly associated with their respective funds and accounts, maintaining clarity and accountability.

Supporting entities expand the system’s ability to classify and manage financial data. The Expense Category entity allows administrators to group expenditures into meaningful classifications, while the Payment Method entity records how transactions are processed, whether through cash, bank transfer, or other means. The Income and Expense entities capture the details of financial transactions, including dates, amounts, and descriptions, with foreign keys linking them to accounts, categories, and payment methods. This design ensures that both revenue and spending are systematically documented and easily traceable.

Finally, the Attachment entity provides a mechanism for linking supporting documents, such as receipts or invoices, to income and expense records. This enhances transparency and strengthens the integrity of financial reporting by allowing administrators to verify transactions with uploaded files. Together, these entities and relationships form a comprehensive financial tracking system that supports accurate record‑keeping, efficient categorization, and reliable reporting. The ERD demonstrates how the system integrates financial data management into a cohesive structure, aligning with the overall goal of improving organizational accountability and operational efficiency.

**Figure 10. Log in and Registration Entity Relationship Diagram of the Web-Based Church Management System**

**Text-Based Diagram: Figure 10 - Integrated Database ERD**

```text
Authentication and Access
+--------+ 1----M +--------+ 1----M +-----------+
| ROLE   |        | USER   |        | AUDIT_LOG |
+--------+        +--------+        +-----------+
                    |
                    | optional link
                    v
Membership and Participation
+------------+ 1----M +--------+ 1----M +------------+ 1----M +---------+
| CELL_GROUP |        | MEMBER |        | ATTENDANCE |        | SERVICE |
+------------+        +--------+        +------------+        +---------+
                         |
                         | 1----M
                         v
                    +--------------------+ M----1 +-------+
                    | EVENT_REGISTRATION |       | EVENT |
                    +--------------------+       +-------+

Finance
+------------------+ 1----M +----------------+
| FINANCE_CATEGORY |        | FINANCE_RECORD |
+------------------+        +----------------+
                                  ^
                                  |
                              recorded_by (FK to USER)

Inventory
+-----------+ 1----M +-----------------+
| INVENTORY |        | INVENTORY_USAGE |
+-----------+        +-----------------+
                          ^
                          |
                      used_by (FK to USER)

Archives and Document Access
+------------------+ 1----M +---------------------+
| ARCHIVE_DOCUMENT |        | DOCUMENT_ACCESS_LOG |
+------------------+        +---------------------+
        ^                                ^
        | uploaded_by (FK to USER)       | user_id (FK to USER)
        +--------------------------------+

Overall relationship summary:
- Role controls many user accounts.
- User accounts create audit logs and may be connected to member records.
- Members belong to cell groups and connect to attendance, services, events, and finance records.
- Events connect to event registrations.
- Finance records are classified by finance categories.
- Inventory records connect to inventory usage records.
- Archive documents and document access logs support controlled digital records access.
```


Figure 10 represents the integrated database design of the Web‑Based Church Management System. It outlines how different modules—such as user management, membership, attendance, events, finance, and inventory—are interconnected to support the organization’s operations. Each entity is defined with its attributes and primary keys, while relationships ensure that data flows logically across the system. This structure provides a unified view of how information is stored, accessed, and maintained.

At the core of the diagram, the Member entity links directly to Cell Groups, Attendance, and Event Registration, establishing the foundation for tracking participation and engagement. The User and Role entities manage authentication and authorization, while the Audit Log and Document Access Log provide accountability by recording system activities. Administrative functions are further supported by the Archive Document entity, which organizes uploaded files and ensures controlled access.

Complementing these modules are the Finance and Inventory entities, which handle resource management. The Finance Category and Finance Record entities capture income and expenses, while the Inventory and Inventory Usage entities track materials and supplies. Together, these components demonstrate how the system integrates people, events, finances, and resources into a cohesive framework. The ERD highlights the modular yet interconnected design, ensuring that the system can deliver accurate records, secure access, and reliable reporting for organizational decision‑making.

### Figure 11. Fishbone Diagram of Manual Attendance Recording


**Text-Based Diagram: Figure 11 - Fishbone Diagram of Manual Attendance Recording**

```text
Problem / Effect: MANUAL ATTENDANCE RECORDING

Human Resources  -----------------------------\
  - Human errors                               \
  - Inconsistent monitoring                    \
                                                   \
Machine  ----------------------------------------\
  - No barcode scanner                           \
  - Lack of automation                            \
                                                     >---- Manual Attendance Recording
Method  ----------------------------------------/
  - Paper-based system                          /
  - Delayed verification                       /
  - Data loss                                  /
  - Record duplication                         /
  - Manual reporting                           /
                                                /
Materials  ------------------------------------/
  - Paper logs                                /
  - Insufficient log sheets                  /
                                              /
Environment  -------------------------------/
  - Disorganized space
```
Figure 11 illustrates the major problem of Manual Attendance Recording, analyzed through the Ishikawa framework using the categories of Man, Machine, Method, Materials, and Environment. This diagram identifies the underlying causes that contribute to inefficiency and inaccuracy in attendance monitoring.

Under Man, errors occur due to inconsistent monitoring and human mistakes in manual logging. Volunteers often record attendance inconsistently, leading to unreliable data. Machine factors include the absence of barcode scanners and lack of automation, preventing real-time validation and efficient data entry. Method issues arise from the continued use of paper-based systems, delayed verification, and manual reporting, which slow down the process and increase the risk of inaccuracies. Materials contribute to the problem through the use of paper logs that are prone to damage, duplication, and data loss. Lastly, the environment characterized by large gatherings, congestion, and disorganized spaces makes manual attendance recording even more difficult and error-prone.

These combined causes result in inaccurate attendance records, delayed reporting, and inefficiency in evaluating member participation. The diagram emphasizes the need for an automated attendance monitoring system that integrates barcode scanning and database storage to ensure accuracy, efficiency, and real-time reporting.

**Figure 12. Fishbone Diagram of Disorganized Member Information**

**Text-Based Diagram: Figure 12 - Fishbone Diagram of Disorganized Member Information**

```text
Problem / Effect: DISORGANIZED MEMBER INFORMATION

Human Resources  -----------------------------\
  - Inconsistent data entry                    \
  - Limited staff consistency                   \
                                                   \
Machine  ----------------------------------------\
  - No centralized database                      \
  - Reliance on scattered devices                \
                                                     >---- Disorganized Member Information
Method  ----------------------------------------/
  - Fragmented records                         /
  - Redundant files                            /
  - Non-standard formats                       /
                                                /
Materials  ------------------------------------/
  - Outdated documents                        /
  - Varying spreadsheets                      /
                                              /
Environment  -------------------------------/
  - Poor storage practices
  - Limited security controls
```


Figure 12 illustrates the major problem of Disorganized Member Information, analyzed through the Ishikawa framework. Several factors contribute to this issue. Errors and redundancy often arise from inconsistent data entry practices and limited staff consistency. The absence of a centralized database system and reliance on scattered devices prevent efficient integration of records. Fragmented record-keeping methods, redundant files, and non-standard formats further complicate data management. Outdated documents and varying spreadsheets add to the confusion, while poor storage practices and limited security controls in the environment increase the risk of data loss and breaches.

Together, these causes result in inconsistent, redundant, and unreliable member information. The diagram emphasizes the importance of a unified and secure database system that consolidates records, ensures consistency, and supports efficient retrieval and management.

**Figure 13. Fishbone Diagram of Poor Event and Financial Management**

**Text-Based Diagram: Figure 13 - Fishbone Diagram of Poor Event and Financial Management**

```text
Problem / Effect: POOR EVENT AND FINANCIAL MANAGEMENT

Human Resources  -----------------------------\
  - Miscommunication among organizers           \
  - Limited training in financial documentation \
                                                   \
Machine  ----------------------------------------\
  - No integrated scheduling system              \
  - Lack of financial tracking tools             \
                                                     >---- Poor Event and Financial Management
Method  ----------------------------------------/
  - Manual coordination of events              /
  - Paper-based recording of contributions     /
  - Absence of verification mechanisms         /
                                                /
Materials  ------------------------------------/
  - Disorganized financial logs               /
  - Scattered event schedules                 /
  - Incomplete records                        /
                                              /
Environment  -------------------------------/
  - Overlapping activities
  - Poor communication channels
  - Limited transparency in reporting
```


Figure 13 illustrates the major problem of Poor Event and Financial Management, analyzed through the Ishikawa framework. Several contributing causes are identified across the categories of Man, Machine, Method, Materials, and Environment. Miscommunication among organizers and limited training in financial documentation often result in planning difficulties and errors. The absence of integrated scheduling systems and financial tracking tools prevents efficient coordination and transparency. Manual methods, such as paper-based recording of contributions and unverified event coordination, increase the risk of discrepancies and delays. Disorganized financial logs, scattered event schedules, and incomplete records further complicate administrative tasks. The environment of overlapping activities, poor communication channels, and limited transparency in reporting exacerbates inefficiency and reduces accountability.

These combined causes explain why event planning and financial management remain problematic under traditional approaches. The diagram emphasizes the need for an integrated system that supports event coordination, automates financial tracking, and ensures transparency in reporting, thereby improving efficiency and accountability in church administration.

## System Development

Figure 14 presents the updated Agile Development Model (2026) used in the development of the Web-Based Church Management System. This model emphasizes iterative progress, continuous feedback, and adaptability, aligning with modern software engineering practices. The Agile approach allowed the researchers to refine each system component through collaboration and evaluation at every stage, ensuring that the final product met the operational needs of Philippine Life Word Mission – Manila Central Church.

The process begins with the Planning and Requirements phase, where interviews and consultations with church staff were conducted to identify administrative challenges and define system objectives. The Design and Prototyping phase follows, focusing on the creation of diagrams, wireframes, and prototypes that visualize workflows and ensure user-centered design.

At the core of the model is the Sprint Cycle, which operates within one- to four-week iterations. Each sprint involves planning, development, testing, and review activities that enable continuous improvement and adaptability to user feedback. The Development phase implements the system using Node.js for backend processing and React.js for frontend responsiveness, integrating secure APIs and barcode/QR scanning technologies for automation.

The Testing and Quality Assurance phase ensures that all modules function correctly and interact seamlessly through unit, integration, and user acceptance testing. Once validated, the system proceeds to the Deployment and Implementation phase, where it is installed on a live server and accompanied by training sessions and documentation for smooth adoption.

Finally, the Review and Feedback phase gathers user insights and performance evaluations to guide future enhancements. This iterative cycle supports the Agile principle of continuous improvement, ensuring that the system remains efficient, reliable, and responsive to the evolving needs of the church organization.

**Figure 14. Agile Development Cycle. Adapted from Leech & Hanslo (2025)**

**Text-Based Diagram: Figure 14 - Agile Development Cycle**

```text
                             +------------------------+
                             | Design & Prototyping   |
                             +------------------------+
                                      |
                                      v
+--------------------------+    +-----------------+    +--------------------------+
| Planning & Requirements  | -> |  Sprint Cycle   | -> | Development              |
+--------------------------+    |  1-5 Weeks      |    +--------------------------+
        ^                       +-----------------+                |
        |                                ^                         v
        |                                |              +--------------------------+
        |                                |              | Testing & Quality        |
        |                                |              | Assurance                |
        |                                |              +--------------------------+
        |                                |                         |
        |                                v                         v
        +--------------------------+ <---------------- +--------------------------+
        | Review & Feedback        |                   | Validated Build / Next   |
        +--------------------------+                   | Sprint Backlog           |
                                                       +--------------------------+
```


Figure 14 illustrates the Agile Development Cycle used in creating the Web‑Based Church Management System. The process is represented as a continuous loop of five stages. Planning and Requirements, Design and Prototyping, Development, Testing and Quality Assurance, and Review and Feedback. Emphasizing iterative improvement and adaptability throughout the project lifecycle.

**Planning and Requirements**

This phase defines the objectives of the system and identifies user needs based on the administrative challenges of the church. It involves consultations with stakeholders to uncover issues such as manual attendance recording, fragmented membership records, and difficulties in financial monitoring. These findings are documented and translated into clear goals, including automated attendance, centralized member databases, and role‑based access control.

As researchers, we conducted interviews with pastors, staff, and members to gather firsthand insights into these challenges. We documented the results and organized them into a sprint backlog, ensuring that priorities were aligned with operational realities. This guided the direction of the project and established a clear foundation for subsequent phases.

**Design and Prototyping**

Once requirements were established, the cycle advanced to design and prototyping, which emphasized user‑centered workflows and accessible interface layouts. Diagrams were created to visualize processes such as registration, donations, and reporting, while wireframes and prototypes simulated navigation and interactions. Feedback sessions ensured usability and accessibility.

As researchers, we developed wireframes and prototypes using iterative refinement. We presented these to church staff for validation, collected their feedback, and adjusted layouts and workflows accordingly. This ensured that the design phase produced a clear and practical foundation for development.

**Development**

The development phase transforms designs into functional modules using Node.js, React.js, and MySQL. Core features such as membership management, financial recording, and reporting are implemented as modular components to maintain scalability and adaptability. Automation is introduced through barcode and QR integration, streamlining attendance monitoring and ensuring secure data handling.

As researchers, we coded the system modules and maintained the architecture in modular form. We committed code to version control for consistency and scalability, ensuring that each feature was properly integrated. This stage represented the translation of conceptual workflows into working software components.

**Testing and Quality Assurance**

Once modules were developed, testing and quality assurance ensured that the system performed reliably and met user expectations. Unit testing validated individual functions, while integration testing confirmed seamless interaction of modules. User acceptance testing was conducted with church staff to evaluate usability in real scenarios.

As researchers, we performed unit and integration tests, documented results, and conducted user acceptance testing during church activities such as Sunday services. We also carried out security checks and performance assessments, ensuring accuracy, resilience, and compliance with operational standards.

**Review and Feedback**

The cycle continues with review and feedback, where user insights and operational evaluations are gathered to refine features and guide subsequent iterations. Administrators and members provide feedback on system performance, highlighting areas for improvement. Sprint retrospectives assess collaboration and workflow efficiency.

As researchers, we collected feedback from administrators and members, logged evaluations into the product backlog, and conducted sprint retrospectives. These actions allowed us to refine features and adapt our practices, reinforcing continuous improvement and responsiveness to user needs.

At the center of this framework lies the sprint cycle, adapted to span of one to five weeks in accordance with the project’s requirements and stakeholder availability. Each sprint encompasses planning, execution, testing, and review, embodying the iterative rhythm of Agile development. To ensure practicality within the study, the cycle was customized by assigning specific durations to different user groups. Administrators were allocated two weeks, providing sufficient time to review requirements, authorize processes, and validate system installation. The Registration Team, Finance Team, Cell Group, and Group Leaders were likewise given two weeks to adapt workflows, test modules, and provide feedback on membership and financial features. Members, whose involvement is primarily focused on usability and accessibility, were assigned a shorter duration of one week to register, test attendance features, and provide feedback on the interface.

The role‑based adjustment ensures that the iterative rhythm of Agile development remains feasible within the academic context. By tailoring sprint durations to stakeholder functions, the model preserves the principles of collaboration and refinement while aligning with the operational realities of the church environment. The cyclical process continues to embody flexibility, transparency, and sustained quality, but in a way that is responsive to the distinct needs of administrators, staff, and members. This adaptation guarantees that the Web‑Based Church Management System evolves effectively through continuous feedback while remaining realistic for the study’s timeframe.

## System Evaluation

The evaluation process focused on user satisfaction, ease of use, and the accuracy of attendance and scheduling features. Feedback was gathered from church members, administrators, and staff to ensure the system addressed their specific needs. Surveys, interviews, and performance reviews were conducted after deployment to assess effectiveness and usability. Continuous updates and improvements were implemented based on user feedback, technological advancements, and evolving service requirements.

## Data Analysis Plan

The researchers selected participants using purposive sampling, as one of the group members is directly involved in the church and possesses extensive knowledge of its operations. This approach allowed the team to intentionally choose respondents who were most familiar with the church’s workflows, reservation processes, and administrative challenges. By focusing on individuals with relevant experience, the researchers ensured that the feedback gathered was accurate, practical, and directly applicable to the system being developed.

To collect data, a structured questionnaire was designed in alignment with the objectives of the study. Clear instructions were provided to guide respondents, encouraging them to answer truthfully and completely. The questionnaire included both closed and open‑ended questions, allowing participants to provide measurable responses while also sharing detailed insights into their experiences. This method ensured that the data collected was comprehensive, reliable, and reflective of the actual needs of the church community.

For the quantitative portion of the analysis, responses were evaluated using a five-point numerical scale. The scale ranged from 1.50 and below, interpreted as Poor, to 4.51–5.00, interpreted as Excellent. Intermediate ranges were categorized as Fair (1.51–2.50), Good (2.51–3.50), and Very Good (3.51–4.50). This structured evaluation allowed the researchers to measure the effectiveness of the system in terms of usability, reliability, and overall satisfaction.

By combining quantitative ratings with qualitative insights from open-ended responses, the analysis provided a holistic understanding of user perceptions. The numerical scale offered a standardized measure of performance, while the narrative feedback captured specific experiences and suggestions for improvement. Together, these methods ensured that the evaluation of the Web-Based Church Management System was both rigorous and reflective of the actual needs of its intended users.

**Table 1. Descriptive interpretation of the mean**

| Scale | Interpretation |
|---|---|
| 4.51 - 5.00 | Excellent |
| 3.5 - 4.50 | Very Good |
| 2.51 - 3.50 | Good |
| 1.51 - 2.50 | Fair |
| 1.50 and below | Poor |

### Statistical Treatment of Data

The data gathered from the System Evaluation Questionnaire will be analyzed using the weighted mean to determine the overall assessment of the Web‑Based Church Management System based on the ISO/IEC 25010 software quality characteristics (e.g., functionality, usability, reliability, and security). To determine the appropriate sample size for the purposive sampling, Slovin’s formula will be applied:

> n=N1+Ne2

Where:

- n = sample size

- N = total population (approx. 800,000)

- e = margin of error (e.g., 0.05 for a 95% confidence level)

The mean response for each category will be calculated using the weighted mean formula:

> x̄=∑f⋅wn

Where:

- x̄ = weighted mean

- f = frequency of each response

- w = weight of the Likert scale option

- n = total number of respondents

In addition, frequency counts and percentages will be utilized to describe the distribution of participants and their demographic variables. Percentages will be computed using:

P=FN×100

Where:

- P = percentage

- F = frequency

- N = total number of participants

**Table 2. Distribution of Participants**

| Participants | Frequency | Percentages |
|---|---:|---:|
| Church Goers | 30 | 64% |
| Admin/Staff | 7 | 15% |
| IT Professionals | 10 | 21% |
| **TOTAL** | **47** | **100%** |

Table 2 presents the distribution of participants according to their respective roles in the study. The majority of respondents are Church Goers (30 participants or 62.5%), followed by IT Professionals (10 participants or 20.8%) and Admin/Staff (7 participants or 14.6%). The total number of participants is 47, representing 100% of the sample population. This breakdown illustrates the composition of respondents who contributed to the system evaluation.

## Implementation Plan

Table 3 shows the implementation of the Web-Based Church Management System follows a structured and collaborative approach to ensure smooth deployment and adoption. The process begins with securing approval from the church administrator, facilitated through formal letters prepared by the researchers. This step, completed within one day, establishes official authorization and alignment with church leadership.

Following approval, the system installation is conducted. This involves setting up the necessary software and hardware components to support the platform. The researchers, in coordination with the administrator, oversee this activity, which is scheduled to be completed within five hours. Once installation is complete, attention shifts to information distribution. Flyers and posters are prepared and disseminated by the administrator and employees, requiring one day to finalize. Manuals are also developed to provide detailed guidance on system usage, ensuring that users have access to clear instructions for navigating the platform.

To reinforce understanding and encourage adoption, a three-day training program is conducted. This training combines hands-on sessions with lectures, allowing administrators, employees, and researchers to gain practical experience with the system while also receiving structured instruction. The training ensures that all stakeholders are equipped with the necessary knowledge and skills to operate the system effectively.

Overall, the implementation plan emphasizes a step-by-step rollout, beginning with administrative approval, followed by technical installation, information dissemination, and comprehensive training. By clearly defining responsibilities and timelines, the plan ensures that the Web-Based Church Management System is introduced in an organized and efficient manner, supporting its successful integration into church operations

**Table 3. Implementation plan
**

| Strategy | Activities | Personas Involved | Duration |
|---|---|---|---|
| Approval from Administrator | Preparation of formal letters | Researchers, Administrators | 1 Day |
| System Installation | Setup of software and hardware components | Researchers, Administrators | 5 Hours |
| Information Dissemination | Distribution of flyers, posters, and manuals | Administrators, Employees | 1 Day |
| Training Program | Hands-on sessions and lectures | Researchers, Administrator, Employees | 3 Day |

## REFERENCES
## Journals
Abun, D., Galat, M. A., & Guzon, S. G. (2023). *Students’ attitude toward the church…*
Divine Word International Journal of Management and Humanities, 2(1).

Adeoye, A., & Imuetinyan, U. (2024). *Web-based church information management
system.* Divine Word International Journal of Management and Humanities.

Aguilar, M. R., et al. (2024). *Integrated online scheduling system for church services.*
IEEE Xplore.

Arcena, G. D., et al. (2024). *Financial controls and practices…* International Journal of
Management, Entrepreneurship, Social Science and Humanities, 7(2).

Arundaa, R., Mokalu, Y. B., & Sintaro, S. (2025). *Church management information
system…* Nuansa Informatika, 19(1).

Asuncion, J. E. L. (2024). *Structured agency among Protestant full-time church
workers…* Agathos: An International Review, 15(2).

Davis, F. D. (1989). *Perceived usefulness, perceived ease of use…* MIS Quarterly,
13(3), 319–340.

Luciano, R. G. (2025). *Enhancing church donation management…* International
Journal of Advanced and Applied Sciences, 12(2).

Lunaa, H. S., & Ingles, A. L. S., Jr. (2024). *A synodal campus ministry…* International
Studies in Catholic Education.

Mayembe, C., & Phiri, J. (2025). *Microservices architecture for church management
systems.* Springer.

Santiago, N. J. (2023). *Theological education and missional formation…*
Transformation, 40(3), 245–254.

Serrano, E. A., et al. (2024). *Modified mobile church application…* IEEE ICSTE
Conference Proceedings.

Vial, G. (2022). *Understanding digital transformation…* Journal of Strategic
Information Systems, 28(2), 118–144.

Wiratama, I., & Desanti, R. (2022). *Analysis and design of web-based information
system…* ResearchGate.

## Thesis and Dissertations
Delos Santos, M., & Ramirez, J. (2023). *Web-based church management system
with biometric attendance monitoring.* Scribd.

Villanueva, R., & Mendoza, P. (2023). *Church membership information system.*
Scribd.

## Websites / Online Sources
IEOM Society. (2024). *Web and mobile-based church management system.*
Conference proceedings (online).

Pulumbarit, J. P. (2025). *Digitalization of church records.* ResearchGate.

Raiyetunbi, O. J., et al. (2022). *Reinforcement ubiquitous real-time church
management system.* ResearchGate.

# APPENDICES

## Appendix Figure 1. Initial interview with the client

**Text-Based Figure Description**

```text
Appendix Figure 1 shows the initial interview with the client.
Visible content:
- Two individuals are standing in front of a wall with church-related photos.
- One person is holding an open laptop, suggesting presentation or validation of the proposed system.
- The image supports the data-gathering activity for the project.
```


## Appendix Figure 2. Follow-up interview with the client

**Text-Based Figure Description**

```text
Appendix Figure 2 shows the follow-up interview with the client.
Visible content:
- Two individuals are seated at a table with a laptop placed between them.
- The setting appears to be an office or consultation area.
- The image supports the continued consultation and validation process for the system.
```


**Appendix Figure 3. Graphical User Interface for Admin and Members of the Web‑Based Church Management System**

**Text-Based GUI Reconstruction**

```text
GUI Screen Set: Web-Based Church Management System

1. Login Screen
+--------------------------------------------------------------+
| PLWM-MCC Church Management System                            |
| Welcome back                                                 |
| [ Email Address ______________________________ ]              |
| [ Password ___________________________________ ]              |
| [ Sign In -> ]                                                |
| Forgot your password? / Back to Website                       |
+--------------------------------------------------------------+

2. Admin Dashboard
+----------------------+---------------------------------------+
| Sidebar Menu         | Church Management System              |
| - Dashboard          | System Admin | email@gmail.com | Sign Out|
| - Members            +---------------------------------------+
| - Cell Groups        | Greetings, Mister Pogi                |
| - Ministry           | [Date]                                |
| - Users              | [Total Members] [Active Members]      |
| - Attendance         | [Finance Month] [Upcoming Event]      |
| - Services           | [Inventory Items] [Upcoming Services] |
| - Finance            | Upcoming Event | Recent Transactions   |
| - Events             | Recent Activity | Services Overview     |
| - Inventory          |                                       |
| - Archives           |                                       |
| - Audit Logs         |                                       |
| - Settings           |                                       |
+----------------------+---------------------------------------+

3. Members Management
+--------------------------------------------------------------+
| Members                                                      |
| [Search name, email, phone...] [Search]                      |
| [All Cell Groups] [All Groups] [All Status] [Add new members]|
| Table: # | Name | Sex | Cell Group | Group | Status | Actions |
+--------------------------------------------------------------+

4. Cell Groups
+--------------------------------------------------------------+
| Cell Groups                                                  |
| [Total Groups] [Areas]                         [+ New Cell Group]|
| [Search by name or area...]                                  |
| Table: # | Name | Area | Members | Actions [Edit] [Delete]    |
+--------------------------------------------------------------+

5. Ministry
+--------------------------------------------------------------+
| Ministry                                                     |
| [Search by ministry name...]                                 |
| Table: # | Ministry | Leader | Members | Status | Actions      |
+--------------------------------------------------------------+

6. Users
+--------------------------------------------------------------+
| Users                                                        |
| [Search users...]                                            |
| Table: # | Name | Role | Email | Status | Last Login | Actions |
+--------------------------------------------------------------+

7. Attendance
+--------------------------------------------------------------+
| Attendance                                                   |
| Member Attendance History                                    |
| [Search member by name, email, or barcode...]                |
| Recent Services: No services found                           |
+--------------------------------------------------------------+

8. Services
+--------------------------------------------------------------+
| Services                                                     |
| [Search service...]                                          |
| Table: # | Service | Date | Time | Location | Status | Actions |
+--------------------------------------------------------------+

9. Finance
+--------------------------------------------------------------+
| Finance                                                      |
| [Category Filters] [Date Range] [Add Transaction]            |
| Table: Date | Type | Category | Amount | Method | Actions      |
+--------------------------------------------------------------+

10. Events
+--------------------------------------------------------------+
| Events                                                       |
| [Search event...] [Add Event]                                |
| Table: Title | Date | Location | Status | Registrants | Actions|
+--------------------------------------------------------------+

11. Inventory
+--------------------------------------------------------------+
| Inventory                                                    |
| [Search item...] [Add Item]                                  |
| Table: Item | Category | Quantity | Unit | Status | Actions    |
+--------------------------------------------------------------+

12. Archives
+--------------------------------------------------------------+
| Archives                                                     |
| [Search document...] [Upload Document]                       |
| Table: Title | Category | Uploaded By | Date | Access | Actions|
+--------------------------------------------------------------+

13. Audit Logs
+--------------------------------------------------------------+
| Audit Logs                                                   |
| [Search logs...] [Filter by date/action/user]                |
| Table: User | Action | Timestamp | IP Address                 |
+--------------------------------------------------------------+

14. Settings / Profile
+--------------------------------------------------------------+
| Account / System Settings                                    |
| Profile information, language setting, notification icon,     |
| system account controls, and sign-out function.              |
+--------------------------------------------------------------+

15. Member Portal
+--------------------------------------------------------------+
| Member Portal                                                |
| Overview | Events | Attendance | Tithes                       |
| My Tithes and Offering History                               |
| Table: Date | Type | Amount                                  |
+--------------------------------------------------------------+
```


**Appendix Figure 3. Interview Report on Church Management Issues**

**Text-Based Figure Description**

```text
This appendix contains scanned/photographed interview report pages documenting
church management issues gathered during client consultation. The pages serve as
supporting evidence for the problem identification and requirements analysis stage.
```


**Figure 4. Concept checklist of the proposed Web‑Based Church Management System**

**Text-Based Figure Description**

```text
This appendix contains a concept checklist for the proposed Web-Based Church
Management System. It appears to validate the presence and acceptability of core
system concepts/modules before or during development.
```


**Appendix Figure 5. Title Approval Sheet of Web‑Based Church Management System**

**Text-Based Figure Description**

```text
This appendix contains the title approval sheet for the Web-Based Church
Management System. It serves as formal documentation that the proposed project
title was reviewed and approved.
```


**Appendix Figure 6. Request for Adviser and Technical Critic**

**Text-Based Figure Description**

```text
This appendix contains the request letter/document for adviser and technical critic.
It supports the formal capstone supervision and technical review process.
```


# ADVANCED SYSTEM ENHANCEMENTS AND SYNCHRONIZATION

To reflect the actual developed state of the Web-Based Church Management System of Philippine Life Word Mission – Manila Central Church, this section documents the advanced enterprise-level modules and capabilities that have been built into the system which exceed the baseline requirements in the initial conceptual document.

## 1. Advanced Ministry & Service Scheduling Engine
To support weekly service coordination and volunteer rotations, a robust scheduling system is implemented containing five integrated data models:
* **`ministry_roles`**: Defines service positions (e.g., Ushers, Musicians, AV Technicians, Speakers).
* **`ministry_memberships`**: Connects members to roles they are certified/trained to perform.
* **`ministry_assignments`**: Assigns specific members to active roles for scheduled Sunday services.
* **`substitute_requests`**: Automates replacement coordination if an assigned volunteer cannot serve, allowing backups to request and accept swaps seamlessly.
* **`ministry_event_invites`**: Coordinates team-scoped invitations for special church events.

## 2. Dynamic Member Profiles & History Logging
To support continuous spiritual monitoring and administrative accuracy, the system includes:
* **`emergency_contacts`**: Captures active phone numbers and names for instant safety notification.
* **`member_notes`**: Provides confidential note logs for spiritual counseling and care tracking.
* **`member_status_history`**: Automatically captures transfer logs and state histories.
* **`cell_group_history`**: Tracks group transfers to maintain a historical log of cell membership timelines.

## 3. Public-Facing Church Portal & Sermon Library
A dedicated public website serves as the outreach and sermon broadcasting channel:
* **`Home Module`**: Broadcasts announcements, beliefs, and dynamic Sunday schedules.
* **`Sermons Catalog`**: Interactive audio/video sermon library cataloging records.
* **`Bible Seminar Modules`**: Coordinates pre-registrations and schedules for specialized bible education.

## 4. Secure Authenticated Files & Versioned Archives
To meet premium security protocols, the system isolates static file uploads:
* **`verifyToken File Serving`**: Files stored under the archives/ and receipts/ upload directories are protected by active JSON Web Token (JWT) middlewares. Unauthenticated requests are immediately denied (HTTP 401), mitigating data scraping threats.
* **`archive_versions`**: Active version-control mechanism allowing document record-keepers to maintain multiple history drafts for a single archive record.
