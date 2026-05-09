// middleware.js (in root directory - same level as package.json)
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Use a proper JWT secret (should match your authUtils.js)
const JWT_SECRET = new TextEncoder().encode("bba-is-awesome");

// API Route Permissions Configuration
// Define which roles can access which API endpoints
const apiPermissions = {
  // Admin only APIs
  adminOnly: [
    "/api/admin",
    "/api/user/create-faculty",
    "/api/user/update-faculty",
    "/api/user/delete-faculty",
  ],

  // Admin + Faculty APIs
  adminFacultyOnly: [
    "/api/faculty",
    "/api/user/get-students",
    "/api/user/update-student",
    "/api/user/get-faculty",
    "/api/user/bulk-update-semester",
    "/api/user/bulk-update-session",
    "/api/faculty/courses",
    "/api/faculty/courses/create",
    "/api/faculty/courses/update",
    "/api/faculty/courses/delete",
  ],

  // Admin + Faculty + CR APIs
  adminFacultyCrOnly: [
    "/api/cr",
    "/api/user/get-class-students",
    "/api/cr/attendance",
    "/api/user/create-student",
  ],

  // Public APIs (no authentication needed)
  publicApis: [
    "/api/auth/login",
    "/api/auth/forgot-password",
    "/api/auth/verify-otp",
    "/api/auth/resend-otp",
    "/api/auth/change-password-otp",
    "/api/auth/verify-change-password-otp",
    "/api/auth/resend-change-password-otp",
  ],

  // Everyone can access (authenticated users only)
  everyone: [
    "/api/user/profile",
    "/api/user/update-profile",
    "/api/user/change-password",
    "/api/student/assignments",
     "/api/student/assignment-submitted",
     "/api/student/attendance",
     "/api/auth/logout",
  ],
};

const publicRoutes = ["/login", "/unauthorized", "/_next", "/favicon.ico"];

// Helper function to check if path matches any pattern
const matchesPath = (path, patterns) => {
  return patterns.some((pattern) => path.startsWith(pattern));
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route),
    )
  ) {
    return NextResponse.next();
  }

  // Check if it's a public API
  if (matchesPath(pathname, apiPermissions.publicApis)) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role;

    // Log for debugging
    console.log(`User role: ${userRole}, accessing: ${pathname}`);

    // Check page routes access
    let hasPageAccess = false;

    // Admin routes - only admin can access
    if (pathname.startsWith("/admin")) {
      hasPageAccess = userRole === "admin";
    }
    // Faculty routes - admin and faculty can access
    else if (pathname.startsWith("/faculty")) {
      hasPageAccess = userRole === "admin" || userRole === "faculty";
    }
    // CR routes - admin, faculty, and cr can access
    else if (pathname.startsWith("/cr")) {
      hasPageAccess =
        userRole === "admin" || userRole === "faculty" || userRole === "cr";
    }
    // Student routes - everyone can access
    else if (
      pathname.startsWith("/student") ||
      pathname === "/dashboard" ||
      pathname === "/"
    ) {
      hasPageAccess = true;
    }
    // API routes protection
    else if (pathname.startsWith("/api")) {
      let hasApiAccess = false;

      // Check Admin Only APIs
      if (matchesPath(pathname, apiPermissions.adminOnly)) {
        hasApiAccess = userRole === "admin";
        if (!hasApiAccess) {
          console.log(
            `❌ Admin only API: ${pathname} - Access denied for ${userRole}`,
          );
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }
      }
      // Check Admin + Faculty APIs
      else if (matchesPath(pathname, apiPermissions.adminFacultyOnly)) {
        hasApiAccess = userRole === "admin" || userRole === "faculty";
        if (!hasApiAccess) {
          console.log(
            `❌ Admin/Faculty API: ${pathname} - Access denied for ${userRole}`,
          );
          return NextResponse.json(
            { error: "Admin or Faculty access required" },
            { status: 403 },
          );
        }
      }
      // Check Admin + Faculty + CR APIs
      else if (matchesPath(pathname, apiPermissions.adminFacultyCrOnly)) {
        hasApiAccess =
          userRole === "admin" || userRole === "faculty" || userRole === "cr";
        if (!hasApiAccess) {
          console.log(
            `❌ Admin/Faculty/CR API: ${pathname} - Access denied for ${userRole}`,
          );
          return NextResponse.json(
            { error: "Insufficient privileges" },
            { status: 403 },
          );
        }
      }
      // Check Everyone APIs (authenticated users)
      else if (matchesPath(pathname, apiPermissions.everyone)) {
        hasApiAccess = true; // Any authenticated user can access
      }
      // Default API access - only admin by default
      else {
        hasApiAccess = userRole === "admin";
        if (!hasApiAccess) {
          console.log(
            `❌ Default API: ${pathname} - Access denied for ${userRole}`,
          );
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }

      hasPageAccess = hasApiAccess;
    }
    // Default - allow access
    else {
      hasPageAccess = true;
    }

    if (!hasPageAccess) {
      console.log(`Access denied for ${userRole} to ${pathname}`);
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth error:", error);
    // Token is invalid
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
