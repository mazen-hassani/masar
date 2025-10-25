// ABOUTME: Translation strings for multi-language support
// ABOUTME: Supports English, Arabic, and Hindi languages

export type Language = 'en' | 'ar' | 'hi';

export const translations = {
  en: {
    // App
    app_name: 'Masar',
    app_tagline: 'Your Project Journey Starts Here',

    // Navigation
    dashboard: 'Dashboard',
    projects: 'Projects',
    profile: 'Profile',
    settings: 'Settings',
    sign_out: 'Sign Out',
    back: 'Back',
    back_to_project: 'Back to Project',

    // Dashboard
    welcome: 'Welcome back!',
    your_dashboard: 'Your Dashboard',
    quick_stats: 'Quick Stats',
    total_projects: 'Total Projects',
    active_projects: 'Active Projects',
    completed_projects: 'Completed Projects',
    total_tasks: 'Total Tasks',
    tasks_in_progress: 'In Progress',
    overdue_tasks: 'Overdue Tasks',
    completion_rate: 'Completion Rate',

    // Projects
    projects_page: 'Projects',
    manage_projects: 'Manage and track your projects',
    new_project: 'New Project',
    create_project: 'Create Project',
    project_name: 'Project Name',
    project_description: 'Description',
    start_date: 'Start Date',
    end_date: 'End Date',
    no_projects: 'No projects yet',
    create_first_project: 'Create Your First Project',
    days_remaining: 'days remaining',
    due_today: 'Due today',
    days_overdue: 'days overdue',
    view: 'View',
    delete: 'Delete',

    // Project Detail
    overview: 'Overview',
    gantt_chart: 'Gantt Chart',
    kanban_board: 'Kanban Board',
    view_activities: 'View activities and tasks',
    view_timeline: 'View project timeline',
    manage_tasks: 'Manage tasks by status',
    activities: 'Activities',
    new_activity: 'New Activity',
    create_activity: 'Create Activity',
    activity_name: 'Activity Name',
    activity_description: 'Activity Description',

    // Tasks
    tasks: 'Tasks',
    new_task: 'New Task',
    create_task: 'Create Task',
    task_name: 'Task Name',
    task_description: 'Task Description',
    task_details: 'Task Details',
    progress: 'Progress',
    status: 'Status',
    assign_to: 'Assign to',
    edit: 'Edit',
    done_editing: 'Done Editing',
    close: 'Close',
    no_tasks: 'No tasks yet',

    // Status
    not_started: 'Not Started',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    verified: 'Verified',

    // Charts & Views
    project_timeline: 'Project Timeline',
    timeline_description: 'Visual representation of project schedule with task dependencies and critical path',
    task_board: 'Task Board',
    board_description: 'Organize and manage tasks by status. Drag and drop to update task status or click a card for details.',
    month: 'Month',
    week: 'Week',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    are_you_sure: 'Are you sure?',
    manage: 'Manage',
    duration: 'Duration',
    hours: 'hours',
    days_until_due: 'Days Until Due',
    assigned_to: 'Assigned To',
    no_description: 'No description',
    edit_mode: 'Edit',

    // Messages
    project_created: 'Project created successfully',
    activity_created: 'Activity created successfully',
    task_created: 'Task created successfully',
    updated_successfully: 'Updated successfully',
    deleted_successfully: 'Deleted successfully',
    failed: 'Operation failed',
  },
  ar: {
    // App
    app_name: 'مسار',
    app_tagline: 'رحلة مشروعك تبدأ هنا',

    // Navigation
    dashboard: 'لوحة التحكم',
    projects: 'المشاريع',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    sign_out: 'تسجيل الخروج',
    back: 'العودة',
    back_to_project: 'العودة إلى المشروع',

    // Dashboard
    welcome: 'أهلا وسهلا!',
    your_dashboard: 'لوحة التحكم الخاصة بك',
    quick_stats: 'إحصائيات سريعة',
    total_projects: 'إجمالي المشاريع',
    active_projects: 'المشاريع النشطة',
    completed_projects: 'المشاريع المكتملة',
    total_tasks: 'إجمالي المهام',
    tasks_in_progress: 'قيد التنفيذ',
    overdue_tasks: 'المهام المتأخرة',
    completion_rate: 'معدل الإنجاز',

    // Projects
    projects_page: 'المشاريع',
    manage_projects: 'إدارة ومتابعة مشاريعك',
    new_project: 'مشروع جديد',
    create_project: 'إنشاء مشروع',
    project_name: 'اسم المشروع',
    project_description: 'الوصف',
    start_date: 'تاريخ البدء',
    end_date: 'تاريخ الانتهاء',
    no_projects: 'لا توجد مشاريع',
    create_first_project: 'إنشاء مشروعك الأول',
    days_remaining: 'أيام متبقية',
    due_today: 'مستحق اليوم',
    days_overdue: 'أيام متأخرة',
    view: 'عرض',
    delete: 'حذف',

    // Project Detail
    overview: 'نظرة عامة',
    gantt_chart: 'مخطط جانت',
    kanban_board: 'لوحة كانبان',
    view_activities: 'عرض الأنشطة والمهام',
    view_timeline: 'عرض الجدول الزمني للمشروع',
    manage_tasks: 'إدارة المهام حسب الحالة',
    activities: 'الأنشطة',
    new_activity: 'نشاط جديد',
    create_activity: 'إنشاء نشاط',
    activity_name: 'اسم النشاط',
    activity_description: 'وصف النشاط',

    // Tasks
    tasks: 'المهام',
    new_task: 'مهمة جديدة',
    create_task: 'إنشاء مهمة',
    task_name: 'اسم المهمة',
    task_description: 'وصف المهمة',
    task_details: 'تفاصيل المهمة',
    progress: 'التقدم',
    status: 'الحالة',
    assign_to: 'إسناد إلى',
    edit: 'تحرير',
    done_editing: 'تم التحرير',
    close: 'إغلاق',
    no_tasks: 'لا توجد مهام',

    // Status
    not_started: 'لم يبدأ',
    in_progress: 'قيد التنفيذ',
    on_hold: 'معلق',
    completed: 'مكتمل',
    verified: 'معتمد',

    // Charts & Views
    project_timeline: 'الجدول الزمني للمشروع',
    timeline_description: 'تمثيل مرئي لجدول المشروع مع تبعيات المهام والمسار الحرج',
    task_board: 'لوحة المهام',
    board_description: 'تنظيم وإدارة المهام حسب الحالة. اسحب وأفلت لتحديث حالة المهمة أو انقر على بطاقة للتفاصيل.',
    month: 'شهر',
    week: 'أسبوع',

    // Common
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    cancel: 'إلغاء',
    save: 'حفظ',
    confirm: 'تأكيد',
    are_you_sure: 'هل أنت متأكد؟',
    manage: 'إدارة',
    duration: 'المدة',
    hours: 'ساعات',
    days_until_due: 'أيام حتى الموعد',
    assigned_to: 'مسند إلى',
    no_description: 'بدون وصف',
    edit_mode: 'تحرير',

    // Messages
    project_created: 'تم إنشاء المشروع بنجاح',
    activity_created: 'تم إنشاء النشاط بنجاح',
    task_created: 'تم إنشاء المهمة بنجاح',
    updated_successfully: 'تم التحديث بنجاح',
    deleted_successfully: 'تم الحذف بنجاح',
    failed: 'فشلت العملية',
  },
  hi: {
    // App
    app_name: 'मसार',
    app_tagline: 'आपकी परियोजना यात्रा यहाँ शुरू होती है',

    // Navigation
    dashboard: 'डैशबोर्ड',
    projects: 'परियोजनाएं',
    profile: 'प्रोफ़ाइल',
    settings: 'सेटिंग्स',
    sign_out: 'साइन आउट',
    back: 'वापस',
    back_to_project: 'परियोजना पर वापस जाएं',

    // Dashboard
    welcome: 'स्वागत है!',
    your_dashboard: 'आपका डैशबोर्ड',
    quick_stats: 'त्वरित आंकड़े',
    total_projects: 'कुल परियोजनाएं',
    active_projects: 'सक्रिय परियोजनाएं',
    completed_projects: 'पूर्ण परियोजनाएं',
    total_tasks: 'कुल कार्य',
    tasks_in_progress: 'प्रगति में',
    overdue_tasks: 'विलंबित कार्य',
    completion_rate: 'पूर्णता दर',

    // Projects
    projects_page: 'परियोजनाएं',
    manage_projects: 'अपनी परियोजनाओं को प्रबंधित और ट्रैक करें',
    new_project: 'नई परियोजना',
    create_project: 'परियोजना बनाएं',
    project_name: 'परियोजना का नाम',
    project_description: 'विवरण',
    start_date: 'प्रारंभ तिथि',
    end_date: 'अंत की तारीख',
    no_projects: 'कोई परियोजना नहीं',
    create_first_project: 'अपनी पहली परियोजना बनाएं',
    days_remaining: 'दिन शेष',
    due_today: 'आज के लिए',
    days_overdue: 'दिन विलंबित',
    view: 'देखें',
    delete: 'हटाएं',

    // Project Detail
    overview: 'अवलोकन',
    gantt_chart: 'गैंट चार्ट',
    kanban_board: 'कनबन बोर्ड',
    view_activities: 'गतिविधियों और कार्यों को देखें',
    view_timeline: 'परियोजना समयरेखा देखें',
    manage_tasks: 'स्थिति के अनुसार कार्यों का प्रबंधन करें',
    activities: 'गतिविधियां',
    new_activity: 'नई गतिविधि',
    create_activity: 'गतिविधि बनाएं',
    activity_name: 'गतिविधि का नाम',
    activity_description: 'गतिविधि विवरण',

    // Tasks
    tasks: 'कार्य',
    new_task: 'नया कार्य',
    create_task: 'कार्य बनाएं',
    task_name: 'कार्य का नाम',
    task_description: 'कार्य विवरण',
    task_details: 'कार्य विवरण',
    progress: 'प्रगति',
    status: 'स्थिति',
    assign_to: 'को सौंपें',
    edit: 'संपादित करें',
    done_editing: 'संपादन पूर्ण',
    close: 'बंद करें',
    no_tasks: 'कोई कार्य नहीं',

    // Status
    not_started: 'शुरू नहीं हुआ',
    in_progress: 'प्रगति में',
    on_hold: 'होल्ड पर',
    completed: 'पूर्ण',
    verified: 'सत्यापित',

    // Charts & Views
    project_timeline: 'परियोजना समयरेखा',
    timeline_description: 'कार्य निर्भरता और महत्वपूर्ण पथ के साथ परियोजना अनुसूची का दृश्य प्रतिनिधित्व',
    task_board: 'कार्य बोर्ड',
    board_description: 'स्थिति के अनुसार कार्यों को व्यवस्थित और प्रबंधित करें। कार्य की स्थिति को अपडेट करने के लिए खींचें और छोड़ें या विवरण के लिए कार्ड पर क्लिक करें।',
    month: 'महीना',
    week: 'सप्ताह',

    // Common
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    confirm: 'पुष्टि करें',
    are_you_sure: 'क्या आप निश्चित हैं?',
    manage: 'प्रबंधित करें',
    duration: 'अवधि',
    hours: 'घंटे',
    days_until_due: 'देय तक के दिन',
    assigned_to: 'को सौंपा गया',
    no_description: 'कोई विवरण नहीं',
    edit_mode: 'संपादित करें',

    // Messages
    project_created: 'परियोजना सफलतापूर्वक बनाई गई',
    activity_created: 'गतिविधि सफलतापूर्वक बनाई गई',
    task_created: 'कार्य सफलतापूर्वक बनाया गया',
    updated_successfully: 'सफलतापूर्वक अपडेट किया गया',
    deleted_successfully: 'सफलतापूर्वक हटा दिया गया',
    failed: 'ऑपरेशन विफल',
  },
};

export type TranslationKey = keyof typeof translations.en;
