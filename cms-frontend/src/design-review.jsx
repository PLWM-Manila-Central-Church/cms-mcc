// Separate Vite development entry. Not an application route or production build input.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { reviewEvents } from './design-review-events';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import api from './api/axiosInstance';
import './index.css';
import './styles/workspace.css';
import './styles/roleWorkspaces.css';

if (!import.meta.env.DEV) throw new Error('Role design review is development-only.');
const roles = ['System Admin','Pastor','Registration Team','Finance Team','Ministry Leader','Cell Leader','Group Leader','Combined Leader','Member'];
const selected = new URLSearchParams(location.search).get('role') || 'System Admin';
const selectedRole = roles.includes(selected) ? selected : 'System Admin';
const modules = ['dashboard','members','cell_groups','ministry','attendance','qr_attendance','services','events','finance','inventory','archives','audit','users','settings','outreach'];
const grants = modules.flatMap(module => ['read','create','update','delete','approve','export','manage'].map(action => `${module}:${action}`));
const qrActions = ['read','configure_session','check_in','review_batch','correct','finalize','record_batch','submit_batch'];
grants.push(...qrActions.map(action=>`qr_attendance:${action}`));
const leader = selectedRole.includes('Leader') && selectedRole !== 'Ministry Leader';
const leaderGrants=grants.filter(grant=>!grant.startsWith('qr_attendance:')||['read','record_batch','submit_batch'].includes(grant.split(':')[1]));
const cellAssignment = { scopeType:'cell_group',scopeId:1,scopeKey:'cell_group:1',teamName:'Sample Cell',permissions:leaderGrants,is_active:1 };
const groupAssignment = { scopeType:'group',scopeId:1,scopeKey:'group:1',teamName:'Sample Group',permissions:leaderGrants,is_active:1 };
const user = { id:1,userId:1,email:'sample@example.com',roleName:leader?'Leader':selectedRole,memberId:1,leadsMinistryId:selectedRole==='Ministry Leader'?1:null,leadsMinistryName:'Sample Ministry',leaderAssignments:selectedRole==='Cell Leader'?[cellAssignment]:selectedRole==='Group Leader'?[groupAssignment]:selectedRole==='Combined Leader'?[cellAssignment,groupAssignment]:[],forcePasswordChange:false };
const permissions = selectedRole==='Pastor' ? grants.filter(grant=>(grant.endsWith(':read')&&!grant.startsWith('users:')&&!grant.startsWith('settings:'))||grant==='archives:approve'||grant==='archives:update') : selectedRole==='Finance Team' ? grants.filter(grant=>grant.startsWith('finance:')||grant==='archives:read'||grant==='dashboard:read') : selectedRole==='Registration Team' ? grants.filter(grant=>!['users:','settings:','finance:','audit:'].some(prefix=>grant.startsWith(prefix))) : grants;
const reviewPermissions = selectedRole === 'Finance Team' ? [...permissions.filter(grant => grant !== 'finance:delete'), 'archives:create', 'archives:update'] : permissions;
const members = [
  {id:1,first_name:'Alex',last_name:'Sample',email:'alex@example.com',phone:'',status:'Active',member_code:'DEMO-001',gender:'Male',cell_group_id:1,group_id:1,join_date:'2026-01-01',CellGroup:{id:1,name:'Sample Cell'},Group:{id:1,name:'Sample Group'}},
  {id:2,first_name:'Jamie',last_name:'Example',email:'jamie@example.com',status:'Active',member_code:'DEMO-002',gender:'Female',cell_group_id:1,group_id:1,join_date:'2026-02-01',CellGroup:{id:1,name:'Sample Cell'},Group:{id:1,name:'Sample Group'}},
];
const event={id:1,title:'Community Gathering',description:'Synthetic design review event',event_date:'2099-10-18',start_date:'2099-10-18',end_date:'2099-10-18',start_time:'09:00',location:'Sample Hall',venue:'Sample Hall',capacity:100,registration_count:2,registration_deadline:'2099-10-17',status:'published',visibility:'public',category:{name:'Fellowship'}};
const service={id:1,title:'Sunday Worship',description:'Synthetic service for local visual review',service_date:'2099-10-18',service_time:'09:00:00',status:'published',location:'Sample Hall',capacity:100,visibility:'public',attendance_count:2};
const qrSession={id:1,title:'Sample check-in session',service_id:1,target_type:'service',status:'open',starts_at:'2099-10-18T01:00:00Z',ends_at:'2099-10-18T03:00:00Z',check_in_opens_at:'2099-10-18T00:30:00Z',check_in_closes_at:'2099-10-18T03:00:00Z',expected_basis:'none',time_zone:'Asia/Manila',service,target:service};
const stats={
  roleSummary:{activeUsers:12,pendingArchives:2,upcomingServices:2,todayAttendance:184,recordsThisMonth:14,membersInScope:24,scopeName:leader?'Sample teams':selectedRole==='Ministry Leader'?'Choir':selectedRole,pendingInvites:3,pendingRequests:2,eligibleCandidates:4,assignedTeamCount:user.leaderAssignments.length,openFollowUps:5,pendingCampaigns:1,availableBalance:285500,pendingExpenses:2},
  members:{total:1108,active:1092,inactive:16,newThisMonth:12},
  finance:{totalThisMonth:185000,totalExpenseThisMonth:64500,netThisMonth:120500,availableBalance:285500,pendingExpenses:2,recentRecords:[{id:1,amount:15000,transaction_date:'2026-11-22',category:{name:"Lord's Day Offering"},is_anonymous:1},{id:2,amount:4500,transaction_date:'2026-11-20',category:{name:'Tithe'},Member:members[0]}]},
  inventory:{lowStock:2,pendingRequests:2},
  events:{upcoming:[event]},
  services:{upcoming:2,list:[service]},
  upcomingSchedules:[
    {id:'service-1',kind:'Service',title:"Lord's Day Service",date:'2026-11-29',time:'09:00:00',detail:'MCC Main Sanctuary',path:'/services/1/attendance'},
    {id:'event-1',kind:'Event',title:'Grand Bible Seminar',date:'2026-11-28',time:'18:00:00',detail:'MCC Main Hall',path:'/events/1'},
  ],
  attendanceOverview:[
    {service_id:101,title:"Lord's Day Service",service_date:'2026-11-22',active:238,inactive:14,total:252,delta:11},
    {service_id:100,title:'Wednesday Gathering',service_date:'2026-11-18',active:142,inactive:6,total:148,delta:-4},
    {service_id:99,title:'HS & YA Fellowship',service_date:'2026-11-14',active:84,inactive:5,total:89,delta:7},
  ],
  recentActivity:[
    {id:1,action:'CREATE_MEMBER',label:'Member Added',actor:'reg@plwmmcc.com',created_at:'2026-11-23T14:20:00Z',target_path:'/members/1'},
    {id:2,action:'QR_CHECK_IN',label:'QR Attendance Scanned',actor:'reg@plwmmcc.com',created_at:'2026-11-23T12:05:00Z',target_path:'/attendance'},
    {id:3,action:'CREATE_FINANCE_RECORD',label:'Offering / Income Recorded',actor:'finance@plwmmcc.com',created_at:'2026-11-22T15:30:00Z',target_path:'/finance'},
  ],
  attendanceTrend:[
    {service_id:98,title:'Nov 1 Service',service_date:'2026-11-01',active:210,inactive:12,total:222},
    {service_id:99,title:'Nov 8 Service',service_date:'2026-11-08',active:225,inactive:16,total:241},
    {service_id:100,title:'Nov 15 Service',service_date:'2026-11-15',active:228,inactive:13,total:241},
    {service_id:101,title:'Nov 22 Service',service_date:'2026-11-22',active:238,inactive:14,total:252},
  ],
  cellGroupAbsences:[
    {cellGroupId:1,cellGroupName:'Lakefront A',totalMembers:42,attended:34,absent:8},
    {cellGroupId:2,cellGroupName:'BF Homes',totalMembers:35,attended:31,absent:4},
  ],
  latestService:{id:101,title:"Lord's Day Service",service_date:'2026-11-22'},
};
let rows = [...members];
const analyticsMonths = ['01','02','03','04','05','06','07','08','09','10'];
const analyticsSample = {
  range:{from:'2026-01-01',to:'2026-10-22'},
  period:{preset:'year',bucket:'month'},
  members:{total:1108,active:1092,inactive:16,new_in_range:42},
  demographics:{
    age_bands:[{label:'0-17',total:96},{label:'18-29',total:318},{label:'30-49',total:402},{label:'50+',total:254},{label:'Unknown',total:38}],
    gender:[{label:'Female',total:642},{label:'Male',total:431},{label:'Unspecified',total:35}],
    cell_groups:[{id:1,label:'Lakefront A',total:128},{id:2,label:'Lakefront B',total:96},{id:3,label:'Grace Cell',total:74},{id:4,label:'Hope Cell',total:61},{id:5,label:'Faith Cell',total:52},{id:null,label:'Other (12 cell groups)',total:180}],
    groups:[{id:1,label:'Worship',total:164},{id:2,label:'Ushering',total:98},{id:3,label:'Sound & Media',total:76},{id:4,label:'Children',total:64},{id:5,label:'Youth',total:58},{id:null,label:'Other (7 groups)',total:120}],
  },
  member_growth:[3,5,2,7,4,9,6,3,1,2].map((total,index)=>({period:`2026-${analyticsMonths[index]}`,total})),
  member_insights:{archived_in_range:5,net_growth:37,retention_rate_pct:98.6,prior_year_new:34,yoy_delta_pct:23.5},
  attendance:{
    service_checkins:1240,
    event_checkins:380,
    buckets:[120,132,118,145,151,160,143,158,149,164].map((service,index)=>({period:`2026-${analyticsMonths[index]}`,service,events:[28,32,26,35,40,44,38,46,42,49][index]})),
  },
  attendance_insights:{
    gatherings_count:42,average_per_gathering:29.5,attendance_rate_pct:68.4,
    first_time_visitors:24,returning_visitors:18,total_visitors:42,
    absent_streak_count:6,week_over_week_delta_pct:4.6,
    by_gathering_type:[
      {type:'lords_day',label:"Lord's Day Service",services_count:30,total:940},
      {type:'wednesday_service',label:'Wednesday Service',services_count:8,total:180},
      {type:'hs_ya_service',label:'HS / YA Fellowship',services_count:3,total:82},
      {type:'bible_seminar',label:'Bible Seminar',services_count:1,total:38},
    ],
  },
  finance:{
    income:482000,
    expenses:196500,
    net:285500,
    buckets:[42000,39500,47800,51200,46800,52400,48900,55100,47200,50600].map((income,index)=>({period:`2026-${analyticsMonths[index]}`,income,expenses:[18000,17200,19800,21400,18600,22300,20100,23500,18900,21600][index],net:income-[18000,17200,19800,21400,18600,22300,20100,23500,18900,21600][index]})),
  },
  finance_insights:{
    expense_ratio_pct:40.8,net_margin_pct:59.2,
    by_income_category:[{label:'Tithes',total:310000},{label:'Sunday Offering',total:112000},{label:'Missions Fund',total:60000}],
    by_expense_category:[{label:'Utilities & Maintenance',total:74500},{label:'Ministry & Outreach',total:68000},{label:'Events & Fellowship',total:54000}],
  },
  group_insights:{
    ministry_participation:[
      {id:1,label:'Young Adults',total:318,active:304,active_rate_pct:95.6},
      {id:2,label:"Men's Ministry",total:210,active:198,active_rate_pct:94.3},
      {id:3,label:"Women's Ministry",total:285,active:276,active_rate_pct:96.8},
      {id:4,label:'High School',total:96,active:92,active_rate_pct:95.8},
    ],
    quiet_cell_groups:[{id:9,label:'Eastbrook Cell',member_count:12}],
  },
  operations_snapshot:{inventory_total_items:84,inventory_low_stock:3,last_verified_backup_at:'2026-11-23 02:00 PHT'},
};
const paged=(key,value)=>({[key]:value,total:value.length,total_pages:1,page:1});
let campaignRows=[
  {id:1,title:'All-member Christmas Eve reminder',audience_type:'all_members',message:'Hi {{first_name}}, join us for Christmas Eve at 7 PM. PLWM-MCC',status:'pending_approval',scheduled_at:'2099-12-23T10:00:00Z',recipient_count:2,estimated_cost_php:0.93,approval_required:true,created_by:2,approved_by:null},
  {id:2,title:'Community Gathering reminder',audience_type:'event',event_id:1,message:'Hi {{first_name}}, {{activity}} is on {{date}} at {{time}}. See you! PLWM-MCC',status:'approved',scheduled_at:'2099-10-17T01:00:00Z',recipient_count:2,estimated_cost_php:0.93,approval_required:false,created_by:1,approved_by:1},
  {id:3,title:'Ministry practice',audience_type:'ministry',ministry_id:1,message:'Hi {{first_name}}, practice is on Saturday at 6 PM. PLWM-MCC',status:'draft',scheduled_at:'2099-10-20T10:00:00Z',recipient_count:2,estimated_cost_php:0.93,approval_required:false,created_by:1,approved_by:null},
];
const campaignPreviewFor = (body) => {
  const message=String(body.message||'');
  const segments=Math.max(1,Math.ceil(message.length/160));
  return {recipients:[{member_id:1,name:'Alex Sample',phone_masked:'+6391*****67',is_minor:false},{member_id:2,name:'Jamie Example',phone_masked:'+6391*****68',is_minor:false}],
    recipient_count:2,excluded:{inactive:0,no_phone:0,no_consent:0,duplicate:0,frequency_cap:0},total_segments:2*segments,segment_count:segments,
    unit_cost_php:0.463,estimated_cost_php:Number((2*segments*0.463).toFixed(2)),monthly_remaining_php:500,
    approval_required:body.audience_type==='all_members',warning:null};
};
function responseData(path,config) {
  if(path==='/auth/session'||path==='/auth/login') return {user,permissions:reviewPermissions,forcePasswordChange:false};
  if(path==='/dashboard/stats') return stats;
  if(path==='/notifications') return [];
  if(path==='/member-portal/profile'||path==='/members/1') return {...members[0],cell_group:{name:'Sample Cell'},group:{name:'Sample Group'}};
  if(path==='/member-portal/attendance') return {records:[],rate:0,total:0,present:0};
  if(path.startsWith('/member-portal/finance')) return {records:[{id:1,amount:2500,transaction_date:'2026-11-02',category:{name:'Tithe'},attachments:[]},{id:2,amount:1200,transaction_date:'2026-11-09',category:{name:'Offering'},attachments:[]}],ytdTotal:12500,total:2,total_pages:1,summary:{total_year:12500}};
  if(path==='/member-portal/schedule') return {
    assignments:[{id:1,confirmed:1,ministryRole:{name:'Choir'},Service:{title:'Sunday Worship Service',service_date:'2026-11-22',service_time:'09:00:00'}}],
    schedules:[
      {id:2,kind:'practice',title:'Choir practice',date:'2026-11-26',startTime:'18:30:00',endTime:'20:00:00',location:'Sanctuary',ministry:'Choir'},
      {id:3,kind:'cleaning',title:'Sanctuary cleaning',date:'2026-11-28',startTime:'08:00:00',location:'Main Hall',ministry:'Choir'},
    ],
    invites:[],
  };
  if(path==='/member-portal/memory-verse') return {group:'Choir',latestSunday:'2026-11-15',upcomingSunday:'2026-11-22',verse:{reference:'Psalm 23:1-6',verse_text:'The LORD is my shepherd; I shall not want.'},thisSundayVerse:null};
  if(path==='/member-portal/bible-reading') {
    const days=Array.from({length:30},(_,index)=>{const date=`2026-11-${String(index+1).padStart(2,'0')}`;return{date,day:'—',ot:`Gen ${index+1}`,nt:`Matt ${index+1}`,ps:`Ps ${index+1}`,placeholder:false};});
    return {month:'2026-11',today:'2026-11-21',target:30,count:12,percent:40,completed:days.slice(0,12).map(day=>day.date),group:'Choir',days,memoryVerse:{latestSunday:'2026-11-15',upcomingSunday:'2026-11-22',verse:{reference:'Psalm 23:1-6',verse_text:'The LORD is my shepherd; I shall not want.'},thisSundayVerse:null}};
  }
  if(path==='/member-portal/events') return reviewEvents;
  if(path==='/member-portal/services') return [service];
  if(path.startsWith('/member-portal/services/')) return {...service,my_response:null};
  if(path==='/member-portal/engagement') return {
    ministry:{id:1,name:'Young Adults'},
    activities:[{id:1,title:'Monthly Young Adults Fellowship',activity_type:'fellowship',activity_date:'2026-11-29',start_time:'14:00',location:'Fellowship Hall',my_response:'yes',my_decline_reason:null}],
    announcements:[{id:1,title:'December Youth Fellowship Preparation',body:'Bring a friend and arrive 15 minutes early for prayer.'}],
    messages:[{id:1,direction:'leader_to_member',body:'Hi Alex! Hope you can join us this Sunday after service.'}],
    feedback:[{id:1,category:'prayer_request',message:'Praying for family health and work guidance.',status:'prayed_for',leader_response:'We are lifting your family in prayer!'}],
  };
  if(/^\/ministries\/\d+\/engagement$/.test(path)) return {
    activities:[{id:1,title:'Monthly Young Adults Fellowship',activity_type:'fellowship',activity_date:'2026-11-29',location:'Fellowship Hall',rsvp_yes:28,rsvp_maybe:6,rsvp_no:3,actual_attended:24}],
    announcements:[{id:1,title:'December Youth Fellowship Preparation',body:'Bring a friend and arrive 15 minutes early for prayer.'}],
    messages:[],
    feedback:[{id:1,member:members[0],category:'prayer_request',message:'Praying for family health and work guidance.',status:'open',leader_response:null}],
    visitations:[{id:1,member:members[1],visit_date:'2026-11-18',visit_type:'phone_call',care_stage:'contacted',notes:'Checked in after missed Sunday.'}],
    reports:{total_members:64,active_members:58,inactive_members:6,participation_rate_pct:72.5,rsvp_yes_total:28,actual_attendance_total:24,decline_reasons:[{reason:'Work shift',count:2}],care_stages:{contacted:1},open_prayer_requests:1},
  };
  if(/^\/members\/\d+\/engagement$/.test(path)) return {
    ministry:{id:1,name:'Young Adults'},
    serving_teams:[{id:1,name:'Choir & Music Team'}],
    rsvp_summary:{yes:4,no:1,maybe:1,actual_attended:4},
    recent_rsvps:[],
    visitations:[{id:1,visit_date:'2026-11-18',visit_type:'phone_call',care_stage:'completed',notes:'Encouraging check-in call.'}],
    feedback:[],
  };
  if(path.startsWith('/member-portal/')) return [];
  if(path==='/members') {
    const query=config.params?.search || new URL(config.url,'http://review.local').searchParams.get('search') || '';
    return paged('members',rows.filter(m=>`${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(String(query).toLowerCase())));
  }
  if(path==='/members/dropdowns/groups') return [{id:1,name:'Sample Group'}];
  if(path==='/reports/registration') return {
    range:{from:'2026-08-25',to:'2026-11-22'},
    events:[
      {id:1,title:'Grand Bible Seminar',category:'Seminar',start_date:'2026-11-23',capacity:200,registered:164,seats:120,parking:40,fill_rate:82},
      {id:2,title:'YAG Fellowship',category:'Fellowship',start_date:'2026-11-28',capacity:80,registered:61,seats:30,parking:12,fill_rate:76.3},
      {id:3,title:'Filipino Service',category:'Special Service',start_date:'2026-11-22',capacity:300,registered:212,seats:180,parking:55,fill_rate:70.7},
      {id:4,title:'Christmas Eve',category:'Special Service',start_date:'2026-12-24',capacity:null,registered:48,seats:0,parking:0,fill_rate:null},
    ],
    totals:{events:4,registrations:485,capacity:580,fill_rate:83.6,seats:330,parking:107},
    categories:[{label:'Seminar',total:164},{label:'Special Service',total:260},{label:'Fellowship',total:61}],
    timeline:Array.from({length:20},(_,i)=>({date:`2026-11-${String(i+1).padStart(2,'0')}`,total:8,cumulative:(i+1)*8})),
    attendance:{services_held:4,check_ins:812,average:203,rows:[
      {id:1,title:'Sunday Service',date:'2026-11-16',present:221,capacity:300,rate:73.7},
      {id:2,title:'Sunday Service',date:'2026-11-09',present:198,capacity:300,rate:66},
      {id:3,title:'Prayer Meeting',date:'2026-11-06',present:142,capacity:200,rate:71},
      {id:4,title:'Sunday Service',date:'2026-11-02',present:251,capacity:300,rate:83.7},
    ]},
  };
  if(path.startsWith('/reports/registration/events/')) return {
    event:{id:1,title:'Grand Bible Seminar',category:'Seminar',start_date:'2026-11-23',capacity:200,registered:164,seats:120,parking:40,fill_rate:82},
    timeline:Array.from({length:8},(_,i)=>({date:`2026-11-${String(15+i).padStart(2,'0')}`,cumulative:(i+1)*20})),
    registrations:Array.from({length:6},(_,i)=>({id:i+1,name:['Alex Sample','Jamie Example','Ruth Sample','Noel Example','Maria Cruz','Ben Reyes'][i],registered_at:`2026-11-${String(15+i).padStart(2,'0')}T09:00:00Z`,seat_number:i<3?i+1:null,parking_slot:i===0?1:null})),
  };
  if(path==='/bible-reading/summary') return {
    month:'2026-11',target:30,total:4,finished:2,
    members:[
      {member_id:1,name:'Alex Sample',completed:30,target:30,percent:100,finished:true},
      {member_id:2,name:'Jamie Example',completed:30,target:30,percent:100,finished:true},
      {member_id:3,name:'Ruth Sample',completed:18,target:30,percent:60,finished:false},
      {member_id:4,name:'Noel Example',completed:7,target:30,percent:23,finished:false},
    ],
  };
  if(path==='/bible-reading/verses') return [
    {id:1,group:'Sample Group',group_id:1,sunday_date:'2026-11-22',reference:'Psalm 23:1-6',verse_text:'The LORD is my shepherd; I shall not want.'},
    {id:2,group:'Sample Group',group_id:1,sunday_date:'2026-11-29',reference:'John 3:16',verse_text:'For God so loved the world.'},
  ];
  if(path==='/ministry/roles') return [{id:1,name:'Choir'},{id:2,name:'Ushering'},{id:3,name:'Media'}];
  if(path==='/ministry/schedules') return [
    {id:1,ministryRoleId:1,ministry:'Choir',kind:'practice',title:'Choir practice',date:'2026-11-26',startTime:'18:30:00',endTime:'20:00:00',location:'Sanctuary'},
    {id:2,ministryRoleId:1,ministry:'Choir',kind:'cleaning',title:'Sanctuary cleaning',date:'2026-11-28',startTime:'08:00:00',location:'Main Hall'},
    {id:3,ministryRoleId:1,ministry:'Choir',kind:'service',title:'Sunday Worship Service',date:'2026-11-22',startTime:'09:00:00',location:'Main Hall'},
  ];
  if(path==='/cellgroups/health-alerts') return {total_cell_groups:12,leaderless_count:1,quiet_30d_count:2,leaderless:[{id:9,name:'Eastbrook Cell',area:'East'}],quiet_30d:[{id:9,name:'Eastbrook Cell',area:'East'}]};
  if(/^\/cellgroups\/\d+\/meetings$/.test(path)) return [{id:1,meeting_date:'2026-11-20',lesson_topic:'Abiding in Christ',scripture_reference:'John 15:1-12',attendees_count:14,visitors_count:2,prayer_notes:'Prayed for upcoming Bible Seminar'}];
  if(path==='/cellgroups') return [{id:1,name:'Sample Cell',area:'Sample area',member_count:2,leader_id:1}];
  if(path.startsWith('/cellgroups/')) return {group:{id:1,name:'Sample Cell'},members};
  if(path==='/users') return [
    {id:1,email:'admin@plwmmcc.com',is_active:1,role:{role_name:selectedRole},member:members[0],last_login_at:'2026-11-23T09:15:00Z'},
    {id:2,email:'finance@plwmmcc.com',is_active:1,role:{role_name:'Finance Team'},member:members[1],last_login_at:'2026-11-22T14:30:00Z'},
    {id:3,email:'pastor@plwmmcc.com',is_active:0,role:{role_name:'Pastor'},member:null,last_login_at:'2026-11-10T08:00:00Z'},
  ];
  if(path==='/roles'||path==='/roles/list') return [...roles.filter(r=>!['Cell Leader','Group Leader','Combined Leader'].includes(r)),'Leader'].map((role_name,i)=>({id:i+1,role_name}));
  if(path==='/members/dropdowns/cell-groups') return [{id:1,name:'Sample Cell'}];
  if(path==='/users/1') return {id:1,email:'sample@example.com',role_id:1,is_active:1,role:{role_name:'System Admin'},member:members[0]};
  if(path==='/services/recurrence') return [{id:1,title:"Lord's Day Service",gathering_type:'lords_day',day_of_week:0,start_time:'09:00:00',venue:'Main Sanctuary'}];
  if(/^\/services\/\d+\/program$/.test(path)) return [{id:1,segment_type:'worship',title:'Congregational Praise & Hymns',start_time:'09:00',assigned_person:'Choir & Music Team'},{id:2,segment_type:'sermon',title:'Sunday Word Message',start_time:'09:40',assigned_person:'Pastor'}];
  if(/^\/services\/\d+\/servants$/.test(path)) return {assignments:[{id:1,member_id:1,Member:members[0],MinistryRole:{name:'Choir'},confirmation_status:'confirmed',confirmed:1,has_conflict:false}],conflict_member_ids:[],summary:{total:1,confirmed:1,pending:0,declined:0}};
  if(path==='/services') return paged('services',[service]);
  if(path==='/services/1') return service;
  if(path==='/services/1/responses') return {responses:[]};
  if(path==='/attendance') return [];
  if(path==='/attendance/pastor-report') return {filters:{time_zone:'Asia/Manila'},summary:{confirmed_visits:0,service_visits:0,event_session_visits:0,unique_attendees:0,expected_sessions:0,awaiting_review:0,provisional_missing:0,provisional_sessions:0,final_absent:0,finalized_sessions:0,event_unique_participants:0},review_health:{submitted_batches:0,awaiting_review:0,sessions_requiring_finalization:0},sessions:[],team_breakdown:{cell_groups:[],groups:[]},trends:[],event_activity_summary:[],pagination:{page:1,total:0,total_pages:1},activity_options:[]};
  if(path.startsWith('/attendance/report')) return {sessions:[],summary:{},teams:[],records:[]};
  if(path==='/events/workspace-summary') return {upcoming_events:3,ongoing_events:1,pending_budgets:1,pending_liquidations:1,active_cash_advances:1};
  if(path==='/events') return paged('events',[event]);
  if(path==='/events/1') return {...event,event,registrations:[]};
  if(path==='/events/1/workspace') return {
    event,registrations_count:42,
    committees:[{id:1,name:'Hospitality & Logistics',responsibilities:'Venue setup, refreshments, ushering',chair:members[0]}],
    assignments:[{id:1,role_title:'Lead Coordinator',status:'confirmed',member:members[0]}],
    program:[{id:1,start_time:'09:00',title:'Opening Prayer & Praise',lead_person:'Worship Team'},{id:2,start_time:'09:45',title:'Bible Message',lead_person:'Pastor'}],
    budgets:[{id:1,title:'Main Event Budget',total_requested:25000,total_approved:25000,status:'approved',items:[]}],
    cash_advances:[{id:1,recipient_name:'Event Coordinator',amount_released:15000,release_date:'2026-10-12',status:'released'}],
    liquidations:[{id:1,total_advanced:15000,total_spent:13200,amount_returned:1800,amount_reimbursed:0,status:'submitted',items:[{id:1,vendor:'Metro Catering',description:'Fellowship lunch',amount:13200}]}],
    inventory_requests:[],posted_expenses:[],
    financial_summary:{requested_budget:25000,approved_budget:25000,cash_advanced:15000,unliquidated_advances:15000,actual_posted_expenses:0,variance:25000,returned_cash:0,reimbursement_due:0},
    checklist:[{key:'program',label:'Program schedule drafted',done:true},{key:'committees',label:'Committees & volunteers assigned',done:true},{key:'budget',label:'Event budget approved',done:true},{key:'liquidation',label:'All released cash advances liquidated',done:false},{key:'completion',label:'Event marked Completed',done:false}],
  };
  if(path.startsWith('/events/1/')) return {registrations:[],attendees:[],total:0,total_pages:1};
  if(path==='/events/categories') return [{id:1,name:'Fellowship'}];
  if(path==='/finance') return paged('records',[{id:1,amount:12500,transaction_date:'2026-11-22',category:{id:1,name:'Tithes'},Member:members[0],receipt_number:'OR-2026-001',recorder:{email:'finance@plwmmcc.com'},attachments:[{id:1,file_name:'nov22-tithe-slip.pdf'}]},{id:2,amount:4800,transaction_date:'2026-11-22',category:{id:2,name:'Offering'},Member:{},is_anonymous:1,receipt_number:'OR-2026-002',recorder:{email:'finance@plwmmcc.com'},attachments:[]}]);
  if(path==='/finance/summary') return [{category:{id:1,name:'Tithes'},total_amount:310000},{category:{id:2,name:'Offering'},total_amount:112000},{category:{id:3,name:'Missions'},total_amount:60000}];
  if(path==='/finance/categories') return [{id:1,name:'Tithes'},{id:2,name:'Offering'},{id:3,name:'Missions'}];
  if(path==='/finance/expense-categories') return [{id:1,category_name:'Utilities'},{id:2,category_name:'Ministry & Outreach'}];
  if(path==='/finance/payment-methods') return [{id:1,method_name:'Cash'},{id:2,method_name:'Bank Transfer'},{id:3,method_name:'GCash'}];
  if(path==='/finance/balance') return {total_income:482000,total_expense:196500,net_balance:285500};
  if(path==='/finance/expenses') return paged('expenses',[{id:1,date:'2026-11-12',amount:12400,description:'Sanctuary electricity bill',category:{category_name:'Utilities'},paymentMethod:{method_name:'Bank Transfer'},attachments:[]}]);
  if(path==='/finance/funds/balances') return [
    {id:1,name:'General Fund',fund_code:'GEN',is_restricted:0,opening_balance:120000,current_balance:245500},
    {id:2,name:'Missions & Outreach Fund',fund_code:'MISS',is_restricted:1,opening_balance:35000,current_balance:68000},
    {id:3,name:'Building Maintenance Fund',fund_code:'BLDG',is_restricted:1,opening_balance:80000,current_balance:92000},
  ];
  if(path==='/finance/accounts/balances') return [
    {id:1,name:'BPI Main Checking',account_type:'bank',account_number_masked:'****4821',opening_balance:180000,current_balance:315500},
    {id:2,name:'Sanctuary Cash on Hand',account_type:'cash',opening_balance:25000,current_balance:48000},
    {id:3,name:'MCC Official GCash',account_type:'gcash',account_number_masked:'0917****890',opening_balance:30000,current_balance:42000},
  ];
  if(path==='/finance/transfers') return [
    {id:1,transaction_number:'TRF-202611-1042',transfer_date:'2026-11-16',amount:35000,fromAccount:{name:'Sanctuary Cash on Hand'},toAccount:{name:'BPI Main Checking'},remarks:'Monday bank deposit of Sunday offering'},
  ];
  if(path==='/finance/expenses/workflow') return [
    {id:10,transaction_number:'EXP-202611-2001',date:'2026-11-18',payee:'Meralco',description:'November electricity bill',amount:18450,status:'pending_approval',category:{category_name:'Utilities'},fund:{name:'General Fund'}},
    {id:11,transaction_number:'EXP-202611-2002',date:'2026-11-17',payee:'PrintHub Manila',description:'Bible Seminar brochures',amount:6200,status:'approved',category:{category_name:'Ministry & Outreach'},fund:{name:'Missions & Outreach Fund'}},
    {id:12,transaction_number:'EXP-202611-1998',date:'2026-11-10',payee:'Maynilad Water',description:'Church water utility',amount:3120,status:'paid',category:{category_name:'Utilities'},fund:{name:'General Fund'}},
  ];
  if(path==='/finance/reports/statement') return {from:'2026-11-01',to:'2026-11-24',beginning_balance:235000,total_income:142500,total_expenses:54200,net_change:88300,ending_balance:323300,internal_transfers_excluded:35000};
  if(path==='/finance/reports/expenses') return {report_type:'monthly_category',grand_total:54200,rows:[{category:'Utilities',count:3,total:24500},{category:'Ministry & Outreach',count:4,total:19200},{category:'Events & Fellowship',count:2,total:10500}]};
  if(path==='/finance/ledger') return [
    {entry_type:'income',id:1,transaction_number:'INC-202611-3001',date:'2026-11-22',category:'Tithes',description:'Sunday Lord\'s Day Tithes',amount:68400,status:'posted'},
    {entry_type:'transfer',id:1,transaction_number:'TRF-202611-1042',date:'2026-11-16',category:'Internal Transfer',description:'Monday bank deposit of Sunday offering',amount:35000,status:'transferred'},
    {entry_type:'expense',id:12,transaction_number:'EXP-202611-1998',date:'2026-11-10',category:'Utilities',description:'Maynilad Water — Church water utility',amount:-3120,status:'paid'},
  ];
  if(path==='/ministry/roles') return [{id:1,name:'Sample Ministry'}];
  if(path==='/ministries') return [
    {id:1,name:'Young Adults',code:'YA',age_min:18,age_max:29,status:'Active',description:'Fellowship and discipleship for young adults.',member_count:64,active_member_count:58,inactive_member_count:6,leader:{id:2,email:'ya.leader@example.com'}},
    {id:2,name:'High School',code:'HS',age_min:13,age_max:17,status:'Active',description:'High school youth fellowship and Bible study.',member_count:42,active_member_count:39,inactive_member_count:3,leader:{id:3,email:'hs.leader@example.com'}},
    {id:3,name:"Men's Ministry",code:'MEN',age_min:30,age_max:null,status:'Active',description:'Brotherhood prayer and service fellowship.',member_count:95,active_member_count:88,inactive_member_count:7,leader:null},
  ];
  if(/^\/ministries\/\d+$/.test(path)) return {
    id:1,name:'Young Adults',code:'YA',age_min:18,age_max:29,status:'Active',description:'Fellowship and discipleship for young adults.',
    member_count:members.length,active_member_count:members.length,leader:{id:2,email:'ya.leader@example.com'},
    members:members.map(m=>({...m,join_date:'2026-03-15'})),
  };
  if(path==='/groups') return [
    {id:1,name:'Choir & Music Team',code:'CHOIR',category:'Worship & Music',status:'Active',description:'Leads congregational praise and special numbers.',member_count:24,position_count:4,open_task_count:2},
    {id:2,name:'Sound & Broadcast Team',code:'TECH',category:'Technical & Media',status:'Active',description:'Manages sanctuary audio, projection, and livestream.',member_count:14,position_count:3,open_task_count:1},
    {id:3,name:'Ushers & Welcome Team',code:'USHER',category:'Service Team',status:'Active',description:'Welcomes congregation and assists seating.',member_count:18,position_count:2,open_task_count:0},
  ];
  if(/^\/groups\/\d+$/.test(path)) return {
    id:1,name:'Choir & Music Team',code:'CHOIR',category:'Worship & Music',status:'Active',description:'Leads congregational praise and special numbers.',
    positions:[{id:1,name:'Choir Director'},{id:2,name:'Soprano'},{id:3,name:'Tenor'},{id:4,name:'Pianist'}],
    member_positions:[{id:1,member:members[0],position:{id:1,name:'Choir Director'}},{id:2,member:members[1],position:{id:2,name:'Soprano'}}],
    roster:members.map((m,i)=>({id:i+1,Member:m})),
    activities:[{id:1,title:'Saturday Choir Rehearsal',activity_date:'2026-10-17',start_time:'14:00',location:'Main Sanctuary'}],
    tasks:[{id:1,title:'Prepare hymn sheet copies',assignedMember:members[0],due_date:'2026-10-16',status:'in_progress'},{id:2,title:'Coordinate rehearsal soundcheck',assignedMember:members[1],due_date:'2026-10-17',status:'pending'}],
  };
  if(path==='/ministry-applications/opportunities') return [{id:1,name:'Welcome Team',is_member:false},{id:2,name:'Music Ministry',is_member:false},{id:3,name:'Media Team',is_member:false,application:{id:1,status:'pending'}}];
  if(path==='/ministry/roles/1') return {id:1,name:'Sample Ministry'};
  if(path==='/ministry/members') return members.map(member=>({...member,member_id:member.id,Member:member,role:{id:1,name:'Sample Ministry'}}));
  if(path.startsWith('/ministry/')) return [];
  if(path==='/inventory/categories') return [{id:1,name:'Equipment'}];
  if(path==='/inventory/items') return paged('items',[{id:1,name:'Sample microphone',category:{name:'Equipment'},quantity:4,unit:'pcs',condition:'Good',availability:'available',item_type:'equipment'}]);
  if(path==='/inventory/request-contexts') return {events:[event],services:[service],ministries:[{id:1,name:'Sample Ministry'}]};
  if(path.includes('/inventory/requests')) return paged('requests',[]);
  if(path==='/inventory/usage') return paged('records',[]);
  if(path==='/inventory/transactions') return [{id:1,occurred_at:'2026-11-20T09:00:00Z',item:{name:'Wireless Microphone'},transaction_type:'adjustment',quantity_delta:2,balance_after:6,notes:'Added two new Shure handheld mics'}];
  if(path==='/inventory/borrowings') return [{id:1,item:{name:'Wireless Microphone'},borrower_name:'Youth Camp Team',quantity:2,quantity_returned:0,due_return_date:'2026-11-30',status:'borrowed',effective_status:'borrowed',is_overdue:false}];
  if(path==='/inventory/maintenance') return [{id:1,maintenance_date:'2026-11-18',item:{name:'Main Sanctuary Mixer'},maintenance_type:'servicing',vendor:'ProAudio Manila',cost:3500,status:'completed'}];
  if(path==='/inventory/reports/extended') return {summary:{total_items:84,reusable_assets:62,consumables:22,total_valuation_php:418500,low_or_out_of_stock:3,active_borrowings:1,overdue_borrowings:0,under_repair:1,total_maintenance_cost_php:3500},by_location:[{location:'Main Sanctuary Booth',count:34},{location:'Storage Room A',count:50}],overdue_list:[],recent_movements:[]};
  if(path==='/inventory/reports') return {total_items:1,total_quantity:4,low_stock:[],by_category:[],by_condition:[]};
  if(path==='/archives/categories') return [{id:1,name:'General'},{id:2,name:'Financial Records'}];
  if(path==='/archives') return paged('records',[{id:1,title:'2026 Church Annual Minutes',category:{id:1,name:'General'},document_date:'2026-11-15',status:'pending',visibility:'public',file_type:'pdf',uploaded_by:1,uploadedByUser:{email:'admin@plwmmcc.com'}}]);
  if(path==='/audit-logs') return paged('logs',[{id:1,action:'REVIEW_SAMPLE',table_name:'sample',created_at:'2026-10-13T02:00:00Z',User:{email:'sample@example.com'},record_id:1}]);
  if(path==='/settings') return {church_name:{value:'PLWM-MCC',type:'string',group:'General',label:'Church name'},default_event_visibility:{value:'public',type:'string',group:'Events',label:'Default event visibility'}};
  if(path==='/qr-attendance/capabilities') return {enabled:true};
  if(path==='/qr-attendance/sessions') return {sessions:[qrSession]};
  if(path==='/qr-attendance/sessions/1') return qrSession;
  if(path==='/qr-attendance/sessions/1/summary') return {confirmed_count:2,expected_count:null,registered_count:2,pending_members_count:0,already_confirmed_pending_count:0,finalization_status:'open'};
  if(path==='/qr-attendance/sessions/1/attendance') return {records:[],count:0};
  if(path==='/qr-attendance/sessions/1/batches') return {batches:[]};
  if(path.startsWith('/qr-attendance/')) return [];
  if(path.includes('analytics')) return analyticsSample;
  return [];
}
// Every API request in this entry is intercepted. No network adapter is called.
api.defaults.adapter=async config=>{
  const path=new URL(config.url,'http://review.local').pathname;
  const method=String(config.method||'get').toLowerCase();
  const body=typeof config.data==='string'?JSON.parse(config.data||'{}'):(config.data||{});
  const canCampaign = ['Registration Team', 'Pastor'].includes(selectedRole);
  const canBroadcast = selectedRole === 'Registration Team';
  if (path === '/outreach/campaigns/member-options') {
    const search = new URL(config.url, 'http://review.local').searchParams.get('search')?.toLowerCase() || '';
    const items = members.map(member => ({ id: member.id, label: [member.first_name, member.last_name].join(' ') }))
      .filter(member => member.label.toLowerCase().includes(search));
    return { data: { success: true, data: { items, total: items.length, total_pages: 1 } }, status: 200, headers: {}, config };
  }
  if(path==='/outreach/availability') return {data:{success:true,data:{schema_ready:true,campaigns_schema_ready:true,enabled:true,mode:'simulation',campaigns_enabled:true,sms_delivery_enabled:false,provider_configured:true,recipient_restriction_configured:true,scheduler_enabled:true,capabilities:{configure:canBroadcast,manage:['System Admin','Registration Team'].includes(selectedRole),global:['System Admin','Pastor','Registration Team'].includes(selectedRole),resolve:true,process:['System Admin','Registration Team'].includes(selectedRole),campaigns:canCampaign,campaign_write:canBroadcast,broadcast:canBroadcast,approve:canBroadcast}}},status:200,headers:{},config};
  if(path==='/outreach/configuration') return {data:{success:true,data:{enabled:true,mode:'simulation',reminder_days:[3,1],reminder_hour:9,daily_sms_cap:30,reminder_template:'Hi {{first_name}}, reminder: {{activity}} on {{date}} at {{time}}. {{venue}} PLWM-MCC',followup_template:'Hi {{first_name}}, PLWM-MCC is checking in. Please contact your leader.',campaigns_enabled:true,campaign_unit_cost_php:0.463,campaign_monthly_budget_php:500,campaign_weekly_member_cap:2,campaign_monthly_member_cap:6,campaign_approval_recipient_threshold:50,campaign_approval_cost_threshold:50,campaign_quiet_start:8,campaign_quiet_end:20}},status:200,headers:{},config};
  if(path==='/outreach/overview') return {data:{success:true,data:{followups:{open:1,assigned:0,resolved:2},deliveries:{queued:0,simulated:1,failed:0,unknown:0}}},status:200,headers:{},config};
  if(['/outreach/follow-ups','/outreach/deliveries','/outreach/members','/outreach/sessions'].includes(path)) return {data:{success:true,data:{items:[],total:0,page:1,total_pages:0}},status:200,headers:{},config};
  if(path==='/outreach/campaigns' && method==='get'){const status=new URL(config.url,'http://review.local').searchParams.get('status');const rows=status?campaignRows.filter(row=>row.status===status):campaignRows;return {data:{success:true,data:{items:rows,total:rows.length,page:1,total_pages:1}},status:200,headers:{},config};}
  if(path==='/outreach/campaigns/preview' && method==='post') return {data:{success:true,data:campaignPreviewFor(body)},status:200,headers:{},config};
  if(path==='/outreach/campaigns' && method==='post'){const preview=campaignPreviewFor(body);const row={id:Math.max(...campaignRows.map(item=>item.id))+1,title:body.title,audience_type:body.audience_type,event_id:body.event_id,ministry_id:body.ministry_id,cell_group_id:body.cell_group_id,message:body.message,status:'draft',scheduled_at:body.scheduled_at,recipient_count:preview.recipient_count,estimated_cost_php:preview.estimated_cost_php,approval_required:preview.approval_required,created_by:user.userId,approved_by:null};campaignRows=[row,...campaignRows];return {data:{success:true,data:row},status:200,headers:{},config};}
  const campaignMatch=path.match(/^\/outreach\/campaigns\/(\d+)(\/.*)?$/);
  if(campaignMatch){const id=Number(campaignMatch[1]);const row=campaignRows.find(item=>item.id===id);const action=campaignMatch[2]||'';if(!row) return {data:{success:true,data:null},status:200,headers:{},config};if(method==='post'&&action==='/submit'){row.status=row.approval_required?'pending_approval':'approved';}if(method==='post'&&action==='/approve'){row.status='approved';row.approved_by=user.userId;}if(method==='post'&&action==='/reject'){row.status='rejected';row.rejection_reason=body.reason;}if(method==='post'&&action==='/cancel'){row.status='cancelled';}if(action==='/deliveries') return {data:{success:true,data:{items:[],total:0,page:1,total_pages:0}},status:200,headers:{},config};return {data:{success:true,data:action?row:{campaign:row,delivery_summary:{}}},status:200,headers:{},config};}
  let data=responseData(path,config);
  if(config.method!=='get' && !path.startsWith('/auth/')) data={message:'Synthetic review action only'};
  return {data:{success:true,data},status:200,statusText:'OK',headers:{},config};
};
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function ReviewToolbar(){
  const [value,setValue]=useState(selectedRole);
  if(new URLSearchParams(location.search).get('embedded')==='1') return null;
  return <aside className="design-review-toolbar" aria-label="Local visual review controls"><strong>LOCAL DESIGN REVIEW</strong><span>Synthetic data · API disconnected</span><label>Role <select value={value} onChange={e=>{setValue(e.target.value);const url=new URL(location.href);url.searchParams.set('role',e.target.value);url.hash=e.target.value==='Member'?'/portal':'/dashboard';location.assign(url.href);}}>{roles.map(role=><option key={role}>{role}</option>)}</select></label><a href="/">Open real local app</a></aside>;
}
if(!location.hash) location.hash=selectedRole==='Member'?'/portal':'/dashboard';
const reviewRoot = import.meta.hot?.data.root || createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.dispose(data => { data.root = reviewRoot; });
reviewRoot.render(<QueryClientProvider client={queryClient}><AuthProvider><HashRouter><ErrorBoundary><ReviewToolbar/><AppRoutes/></ErrorBoundary></HashRouter></AuthProvider></QueryClientProvider>);
