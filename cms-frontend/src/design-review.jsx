// Separate Vite development entry. Not an application route or production build input.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
const modules = ['dashboard','members','cell_groups','ministry','attendance','qr_attendance','services','events','finance','inventory','archives','audit','users','settings'];
const grants = modules.flatMap(module => ['read','create','update','delete','approve','export','manage'].map(action => `${module}:${action}`));
const qrActions = ['read','configure_session','check_in','review_batch','correct','finalize','record_batch','submit_batch'];
grants.push(...qrActions.map(action=>`qr_attendance:${action}`));
const leader = selectedRole.includes('Leader') && selectedRole !== 'Ministry Leader';
const leaderGrants=grants.filter(grant=>!grant.startsWith('qr_attendance:')||['read','record_batch','submit_batch'].includes(grant.split(':')[1]));
const cellAssignment = { scopeType:'cell_group',scopeId:1,scopeKey:'cell_group:1',teamName:'Sample Cell',permissions:leaderGrants,is_active:1 };
const groupAssignment = { scopeType:'group',scopeId:1,scopeKey:'group:1',teamName:'Sample Group',permissions:leaderGrants,is_active:1 };
const user = { id:1,userId:1,email:'sample@example.com',roleName:leader?'Leader':selectedRole,memberId:1,leadsMinistryId:selectedRole==='Ministry Leader'?1:null,leadsMinistryName:'Sample Ministry',leaderAssignments:selectedRole==='Cell Leader'?[cellAssignment]:selectedRole==='Group Leader'?[groupAssignment]:selectedRole==='Combined Leader'?[cellAssignment,groupAssignment]:[],forcePasswordChange:false };
const permissions = selectedRole==='Pastor' ? grants.filter(grant=>(grant.endsWith(':read')&&!grant.startsWith('users:')&&!grant.startsWith('settings:'))||grant==='archives:approve'||grant==='archives:update') : selectedRole==='Finance Team' ? grants.filter(grant=>grant.startsWith('finance:')||grant==='archives:read'||grant==='dashboard:read') : selectedRole==='Registration Team' ? grants.filter(grant=>!['users:','settings:','finance:','audit:'].some(prefix=>grant.startsWith(prefix))) : grants;
const members = [
  {id:1,first_name:'Alex',last_name:'Sample',email:'alex@example.com',phone:'',status:'Active',member_code:'DEMO-001',gender:'Male',cell_group_id:1,group_id:1,join_date:'2026-01-01',CellGroup:{id:1,name:'Sample Cell'},Group:{id:1,name:'Sample Group'}},
  {id:2,first_name:'Jamie',last_name:'Example',email:'jamie@example.com',status:'Active',member_code:'DEMO-002',gender:'Female',cell_group_id:1,group_id:1,join_date:'2026-02-01',CellGroup:{id:1,name:'Sample Cell'},Group:{id:1,name:'Sample Group'}},
];
const event={id:1,title:'Community Gathering',description:'Synthetic design review event',event_date:'2099-10-18',start_date:'2099-10-18',end_date:'2099-10-18',start_time:'09:00',location:'Sample Hall',venue:'Sample Hall',capacity:100,registration_count:2,registration_deadline:'2099-10-17',status:'published',visibility:'public',category:{name:'Fellowship'}};
const service={id:1,title:'Sunday Worship',description:'Synthetic service for local visual review',service_date:'2099-10-18',service_time:'09:00:00',status:'published',location:'Sample Hall',capacity:100,visibility:'public',attendance_count:2};
const qrSession={id:1,title:'Sample check-in session',service_id:1,target_type:'service',status:'open',starts_at:'2099-10-18T01:00:00Z',ends_at:'2099-10-18T03:00:00Z',check_in_opens_at:'2099-10-18T00:30:00Z',check_in_closes_at:'2099-10-18T03:00:00Z',expected_basis:'none',time_zone:'Asia/Manila',target:service};
const stats={roleSummary:{activeUsers:12,pendingArchives:2,upcomingServices:1,todayAttendance:2,recordsThisMonth:2,membersInScope:2,scopeName:leader?'Sample teams':selectedRole==='Ministry Leader'?'Sample Ministry':selectedRole,pendingInvites:1,pendingRequests:1,eligibleCandidates:2,assignedTeamCount:user.leaderAssignments.length},members:{total:2,active:2,inactive:0,newThisMonth:1},finance:{totalThisMonth:1200,recentRecords:[]},inventory:{lowStock:0,pendingRequests:1},events:{upcoming:[event]},services:{upcoming:1},recentActivity:[{id:1,action:'REVIEW_SAMPLE',User:{email:'sample@example.com'}}],attendanceTrend:[],cellGroupAbsences:[],latestService:null};
let rows = [...members];
const paged=(key,value)=>({[key]:value,total:value.length,total_pages:1,page:1});
function responseData(path,config) {
  if(path==='/auth/session'||path==='/auth/login') return {user,permissions,forcePasswordChange:false};
  if(path==='/dashboard/stats') return stats;
  if(path==='/notifications') return [];
  if(path==='/member-portal/profile'||path==='/members/1') return {...members[0],cell_group:{name:'Sample Cell'},group:{name:'Sample Group'}};
  if(path==='/member-portal/attendance') return {records:[],rate:0,total:0,present:0};
  if(path.startsWith('/member-portal/finance')) return {records:[],summary:{total_year:0},total:0,total_pages:1};
  if(path==='/member-portal/events') return [event];
  if(path==='/member-portal/services') return [service];
  if(path.startsWith('/member-portal/services/')) return {...service,my_response:null};
  if(path.startsWith('/member-portal/')) return [];
  if(path==='/members') {
    const query=config.params?.search || new URL(config.url,'http://review.local').searchParams.get('search') || '';
    return paged('members',rows.filter(m=>`${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(String(query).toLowerCase())));
  }
  if(path==='/members/dropdowns/groups') return [{id:1,name:'Sample Group'}];
  if(path==='/cellgroups') return [{id:1,name:'Sample Cell',area:'Sample area',member_count:2,leader_id:1}];
  if(path.startsWith('/cellgroups/')) return {group:{id:1,name:'Sample Cell'},members};
  if(path==='/users') return [{id:1,email:'sample@example.com',is_active:1,role:{role_name:selectedRole},member:members[0]}];
  if(path==='/roles'||path==='/roles/list') return [...roles.filter(r=>!['Cell Leader','Group Leader','Combined Leader'].includes(r)),'Leader'].map((role_name,i)=>({id:i+1,role_name}));
  if(path==='/members/dropdowns/cell-groups') return [{id:1,name:'Sample Cell'}];
  if(path==='/users/1') return {id:1,email:'sample@example.com',role_id:1,is_active:1,role:{role_name:'System Admin'},member:members[0]};
  if(path==='/services') return paged('services',[service]);
  if(path==='/services/1') return service;
  if(path==='/services/1/responses') return {responses:[]};
  if(path==='/attendance') return [];
  if(path==='/attendance/pastor-report') return {summary:{},review_health:{},sessions:[],team_breakdown:[],trends:[],event_activity_summary:[],pagination:{page:1,total:0,total_pages:1},activity_options:[]};
  if(path.startsWith('/attendance/report')) return {sessions:[],summary:{},teams:[],records:[]};
  if(path==='/events') return paged('events',[event]);
  if(path==='/events/1') return {...event,event,registrations:[]};
  if(path.startsWith('/events/1/')) return {registrations:[],attendees:[],total:0,total_pages:1};
  if(path==='/events/categories') return [{id:1,name:'Fellowship'}];
  if(path==='/finance') return paged('records',[{id:1,amount:1200,transaction_date:'2026-10-01',category:{id:1,name:'Tithe'},member:members[0],receipt_number:'SAMPLE-001',encodedBy:{email:'sample@example.com'}}]);
  if(path==='/finance/summary') return [{category_name:'Tithe',category_id:1,total:1200}];
  if(path==='/finance/balance') return {total_income:1200,total_expense:0,net_balance:1200};
  if(path==='/finance/expenses') return paged('expenses',[]);
  if(path==='/finance/categories') return [{id:1,name:'Tithe'},{id:2,name:'Offering'}];
  if(path==='/ministry/roles') return [{id:1,name:'Sample Ministry'}];
  if(path==='/ministry/roles/1') return {id:1,name:'Sample Ministry'};
  if(path==='/ministry/members') return members.map(member=>({...member,member_id:member.id,Member:member,role:{id:1,name:'Sample Ministry'}}));
  if(path.startsWith('/ministry/')) return [];
  if(path==='/inventory/categories') return [{id:1,name:'Equipment'}];
  if(path==='/inventory/items') return paged('items',[{id:1,name:'Sample microphone',category:{name:'Equipment'},quantity:4,unit:'pcs',condition:'Good',availability:'available',item_type:'equipment'}]);
  if(path==='/inventory/request-contexts') return {events:[event],services:[service],ministries:[{id:1,name:'Sample Ministry'}]};
  if(path.includes('/inventory/requests')) return paged('requests',[]);
  if(path==='/inventory/usage') return paged('records',[]);
  if(path==='/inventory/reports') return {total_items:1,total_quantity:4,low_stock:[],by_category:[],by_condition:[]};
  if(path==='/archives/categories') return [{id:1,name:'General'}];
  if(path==='/archives') return paged('records',[]);
  if(path==='/audit-logs') return paged('logs',[{id:1,action:'REVIEW_SAMPLE',table_name:'sample',created_at:'2026-10-13T02:00:00Z',User:{email:'sample@example.com'},record_id:1}]);
  if(path==='/settings') return {church_name:{value:'PLWM-MCC',type:'string',group:'General',label:'Church name'},default_event_visibility:{value:'public',type:'string',group:'Events',label:'Default event visibility'}};
  if(path==='/qr-attendance/capabilities') return {enabled:true};
  if(path==='/qr-attendance/sessions') return {sessions:[qrSession]};
  if(path==='/qr-attendance/sessions/1') return qrSession;
  if(path==='/qr-attendance/sessions/1/summary') return {confirmed_count:2,expected_count:null,registered_count:2,pending_members_count:0,already_confirmed_pending_count:0,finalization_status:'open'};
  if(path==='/qr-attendance/sessions/1/attendance') return {records:[],count:0};
  if(path==='/qr-attendance/sessions/1/batches') return {batches:[]};
  if(path.startsWith('/qr-attendance/')) return [];
  if(path.includes('analytics')) return {range:{},members:{total:2,active:2,inactive:0},demographics:{groups:[],cell_groups:[],genders:[],statuses:[]},member_growth:[],attendance:{},finance:null};
  return [];
}
// Every API request in this entry is intercepted. No network adapter is called.
api.defaults.adapter=async config=>{
  const path=new URL(config.url,'http://review.local').pathname;
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
createRoot(document.getElementById('root')).render(<QueryClientProvider client={queryClient}><AuthProvider><HashRouter><ErrorBoundary><ReviewToolbar/><AppRoutes/></ErrorBoundary></HashRouter></AuthProvider></QueryClientProvider>);
