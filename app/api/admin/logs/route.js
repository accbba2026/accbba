// app/api/admin/logs/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Log from '@/app/models/Log';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

// GET /api/admin/logs - Get logs with pagination and filters
export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    // Only admin can view logs
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const userRole = searchParams.get('userRole');
    const resourceType = searchParams.get('resourceType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    
    const query = {};
    
    if (action && action !== 'all') query.action = action;
    if (userRole && userRole !== 'all') query.userRole = userRole;
    if (resourceType && resourceType !== 'all') query.resourceType = resourceType;
    if (status && status !== 'all') query.status = status;
    if (userId) query.user = userId;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    
    // Text search in details
    if (search) {
      query.$or = [
        { details: { $regex: search, $options: 'i' } },
        { resourceName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      Log.find(query)
        .populate('user', 'name email collegeId role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Log.countDocuments(query),
    ]);
    
    // Get unique actions for filter dropdown
    const uniqueActions = await Log.distinct('action');
    const uniqueUserRoles = await Log.distinct('userRole');
    const uniqueResourceTypes = await Log.distinct('resourceType');
    
    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        actions: uniqueActions,
        userRoles: uniqueUserRoles,
        resourceTypes: uniqueResourceTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/logs - Bulk delete logs
export async function DELETE(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const body = await request.json();
    const { logIds, deleteAll, dateRange, olderThan } = body;
    
    let query = {};
    
    // Delete by specific log IDs
    if (logIds && logIds.length > 0) {
      query._id = { $in: logIds };
    }
    
    // Delete all logs
    else if (deleteAll) {
      query = {};
    }
    
    // Delete by date range
    else if (dateRange && dateRange.startDate && dateRange.endDate) {
      query.createdAt = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate + 'T23:59:59.999Z'),
      };
    }
    
    // Delete logs older than specific days
    else if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);
      query.createdAt = { $lt: cutoffDate };
    }
    
    else {
      return NextResponse.json({ 
        success: false, 
        message: 'No deletion criteria provided' 
      }, { status: 400 });
    }
    
    const result = await Log.deleteMany(query);
    
    // Log the deletion action
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "SYSTEM_LOGOUT", // Using SYSTEM_LOGOUT as a general system action
      resourceType: "system",
      details: `Admin ${currentUser.name} (${currentUser.email}) deleted ${result.deletedCount} log entries. Criteria: ${JSON.stringify(body)}`,
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} log(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting logs:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}