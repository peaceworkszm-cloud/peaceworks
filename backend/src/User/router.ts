import express from "express";
import { prisma } from "../../config/db";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { hash, compare } from "bcrypt";
import { sendMail, generateOTP, generateEmailLayout } from "../../utils";
import { VerifyEmailAndOTPRequest } from "../../types/interface";
import { skilsrole } from "../../config/constructionRoles";

const userRouter = express.Router();

export const userRegisterController = async (req: Request, res: Response) => {
  try {
    const { username, email, password, phoneNumber, role, frontendUrl, nrc_card_id, jobTitle } = req.body;

    // Require phone number and NRC ID
    if (!phoneNumber || !nrc_card_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Phone number and NRC ID are required" });
    }

    // Check if email or phoneNumber already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "Email already exists" });
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "Phone number already exists" });
      }
    }

    // Hash password and generate verification token
    const hashedPassword = await hash(password, 10);
    const verificationToken = generateOTP();

    // Create user in the database
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        phoneNumber,
        role: role || "STAFF",
        jobTitle: skilsrole.includes(jobTitle) ? jobTitle : "General Worker",
        emailVerificationToken: verificationToken,
        isEmailVerified: false,
        nrc_card_id: nrc_card_id,
      },
    });

    // If this is user ID 1, make them a SUPERUSER
    if (user.id === 1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          role: "SUPERUSER",
          group: user.id 
        },
      });
      user.role = "SUPERUSER";
    }
    // If user is an ADMIN, assign group ID
    else if (role === "ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { group: user.id },
      });
    }

    // Build verification email content
    const bodyContent = `
    <p style="color: #2d3748; font-size: 1rem;">Dear ${user.username},</p>
    <p style="color: #4a5568; font-size: 1rem; margin-top: 0.5rem;">
      Thank you for registering with us. We're excited to have you join our team .
    </p>
    <p style="color: #4a5568; font-size: 1rem; margin-top: 0.5rem;">
      Please verify your email by using the following code:
    </p>
    <div style="text-align: center; font-size: 1.25rem; font-weight: bold; color: #2f855a; margin: 1rem auto; padding: 0.5rem; background-color: #f0fff4; border-radius: 0.375rem; max-width: 20rem;">
      ${verificationToken}
    </div>
    <p style="color: #4a5568; font-size: 1rem; margin-top: 0.5rem;">
      Or click the link below to verify your email:
    </p>
    <div style="text-align: center; margin-top: 1rem;">      <a href="${frontendUrl}/verify/email/${verificationToken}" style="background-color: #48bb78; color: #ffffff; padding: 0.5rem 1rem; border-radius: 0.25rem; display: inline-block; text-decoration: none;">
        Verify Email
      </a>
    </div>
  `;

    const emailOptions = {
      to: user.email,
      subject: "Welcome to Management - Verify Your Email",
      html: generateEmailLayout({
        title: "Welcome to Management - Verify Your Email",
        bodyContent,
      }),
    };

    await sendMail(emailOptions);

    return res.status(StatusCodes.OK).json({ 
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      message: user.id === 1
        ? "Registration successful. You have been assigned as SUPERUSER. Please verify your email."
        : "Registration successful. Please verify your email.",
    }); 
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to register user",
      error: error?.stack || error?.message || error,
    });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json("User not found");
    }

    const verifyPassword = await compare(password, user.password);
    if (!verifyPassword) {
      return res.status(StatusCodes.UNAUTHORIZED).send("Invalid Password");
    }

    // Optionally, check if email is verified
    if (!user.isEmailVerified) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Email not verified. Please verify your email before logging in.",
        needsVerification: true,
      });
    }    // Initialize store and warehouse IDs and store names
    let storeIds: number[] = [];
    let storeNames: string[] = [];
    let warehouseIds: number[] = [];

    // For STAFF or STOREMANAGER roles, query for associated store and warehouse IDs
    // Guard in case the Prisma schema/client does not include Store/Warehouse models.
    const prismaAny = prisma as any;
    if ((user.role === "STAFF" || user.role === "STOREMANAGER") && prismaAny.store && prismaAny.warehouse) {
      const stores = await prismaAny.store.findMany({
        where: {
          OR: [
            { managers: { some: { id: user.id } } },
            { staff: { some: { id: user.id } } },
          ],
        },
        select: { id: true, name: true },
      });
      storeIds = stores.map((store: { id: number }) => store.id);
      storeNames = stores.map((store: { name: string }) => store.name);

      const warehouses = await prismaAny.warehouse.findMany({
        where: {
          OR: [
            { managers: { some: { id: user.id } } },
            { staff: { some: { id: user.id } } },
          ],
        },
        select: { id: true },
      });
      warehouseIds = warehouses.map((warehouse: { id: number }) => warehouse.id);
    }

    // Return user details with separate properties for storeIds and warehouseIds
    return res.status(StatusCodes.OK).json({      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      jobTitle: user.jobTitle,
      group: user.group,
      nrc_card_id: user.nrc_card_id,
      bloodGroup: user.bloodGroup,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      emergencyContact: user.emergencyContact,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      storeIds,
      storeNames,
      warehouseIds,
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: "Failed to authenticate user",
      error: error?.stack || error?.message || error,
    });
  }
};

export const userForgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email, frontendUrl } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json("User not found");
    }

    const otp = generateOTP(); // Generate OTP here

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { token: otp },
    });

    // Build OTP email content for password reset
    const bodyContent = `
    <p style="color: #2d3748; font-size: 1rem;">Dear ${updatedUser.username},</p>
    <p style="color: #4a5568; font-size: 1rem; margin-top: 0.5rem;">
      You have requested to reset your password. Use the OTP below to proceed.
    </p>
    <div style="text-align: center; font-size: 1.25rem; font-weight: bold; color: #2f855a; margin: 1rem auto; padding: 0.5rem; background-color: #f0fff4; border-radius: 0.375rem; max-width: 20rem;">
      ${otp}
    </div>
    <p style="color: #4a5568; font-size: 1rem; margin-top: 0.5rem;">
      If you did not request this, please ignore this message.
    </p>
    <p style="color: #4a5568; font-size: 1rem; margin-top: 0.5rem;">
      Use the link below to update your password:
    </p>
    <div style="text-align: center; margin-top: 1rem;">      <a href="${frontendUrl}/update/password" style="background-color: #48bb78; color: #ffffff; padding: 0.5rem 1rem; border-radius: 0.25rem; display: inline-block; text-decoration: none;">
        Update Password
      </a>
    </div>
  `;
  

    const emailOptions = {
      to: user.email,
      subject: "Your OTP for Password Reset",
      html: generateEmailLayout({
        title: "Password Reset Request",
        bodyContent,
      }),
    };

    await sendMail(emailOptions);

    return res
      .status(StatusCodes.OK)
      .json("OTP sent to your email account for password reset");
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: "Failed to send OTP for password reset",
      error: error?.stack || error?.message || error,
    });
  }
};

export const verifyEmailAndOTP = async (req: Request, res: Response) => {
  try {
    const { otp, email, password } = req.body as VerifyEmailAndOTPRequest;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json("Invalid email");
    }

    // Verify OTP
    if (user.token !== otp) {
      return res.status(StatusCodes.BAD_REQUEST).json("Invalid OTP");
    }

    // Clear the OTP after successful verification and update password
    await prisma.user.update({
      where: { id: user.id },
      data: { token: null },
    });

    const hashedPassword = await hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Build success notification email content
    const bodyContent = `
    <p class="text-gray-800 text-base">Dear ${user.username},</p>
    <p class="text-gray-700 text-base mt-2">
      Your password has been successfully reset.
    </p>
    <p class="text-gray-700 text-base mt-2">
      If you did not perform this action, please <a href="|" class="text-indigo-600 underline">contact support</a> immediately.
    </p>
  `;

    const emailOptions = {
      to: user.email,
      subject: "Password Reset Successful",
      html: generateEmailLayout({
        title: "Password Reset Successful",
        bodyContent,
      }),
    };

    try {
      await sendMail(emailOptions);
    } catch (mailError) {
      console.error("Error sending verification email:", mailError);
    }

    return res.status(StatusCodes.OK).json("Password updated successfully");
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: "Failed to verify email and OTP or update password",
      error: error?.stack || error?.message || error,
    });
  }
};


export const updateUserProfileController = async (req: Request, res: Response) => {
  try {
    const { 
      userId,
      username, 
      email, 
      firstName,
      middleName,
      lastName,
      phoneNumber, 
      bloodGroup, 
      address, 
      dateOfBirth, 
      gender, 
      emergencyContact,
      profilePicture,
      bio,
      location,
      role,
      jobTitle,
      isEmailVerified,
      frontendUrl
    } = req.body;

    // Remove admin auth check for STOREMANAGER role
    const id = Number(userId);
    console.log("Request Body:", req.body);

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    let updateData: any = {};

    if (username) updateData.username = username;
    if (firstName) updateData.firstName = firstName;
    if (middleName) updateData.middleName = middleName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (bloodGroup?.trim()) updateData.bloodGroup = bloodGroup;
    if (address?.trim()) updateData.address = address;
    if (gender) updateData.gender = gender;
    if (emergencyContact?.trim()) updateData.emergencyContact = emergencyContact;
    if (profilePicture?.trim()) updateData.profilePicture = profilePicture;
    if (bio?.trim()) updateData.bio = bio;
    if (location?.trim()) updateData.location = location;
    if (role) updateData.role = role;
    if (jobTitle?.trim()) {
      if (!skilsrole.includes(jobTitle)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Invalid construction role selected",
          allowedRoles: skilsrole,
        });
      }
      updateData.jobTitle = jobTitle;
    }

    // Handle dateOfBirth conversion with extra validation
    if (dateOfBirth) {
      const parsedDate = new Date(dateOfBirth);
      if (!isNaN(parsedDate.getTime())) {
        updateData.dateOfBirth = parsedDate;
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid dateOfBirth format" });
      }
    }

    let sendVerificationEmail = false;
    if (email && email !== existingUser.email) {
      const verificationToken = generateOTP();
      updateData.email = email;
      updateData.isEmailVerified = false;
      updateData.emailVerificationToken = verificationToken;
      sendVerificationEmail = true;
    } else if (typeof isEmailVerified === "boolean" && email === existingUser.email) {
      updateData.isEmailVerified = isEmailVerified;
    }

    console.log("Update Data:", updateData);
    const updatedUser = await prisma.user.update({ where: { id }, data: updateData });
    console.log("User updated successfully:", updatedUser);

    if (sendVerificationEmail) {
      const bodyContent = `
        <p class="text-gray-800 text-base">Dear ${username || existingUser.username},</p>
        <p class="text-gray-700 text-base mt-2">
          Please verify your new email address by using the following code:
        </p>
        <div class="text-center text-xl font-bold text-green-700 my-4 p-2 bg-green-100 rounded-md max-w-xs mx-auto">
          ${updatedUser.emailVerificationToken}
        </div>
        <p class="text-gray-700 text-base mt-2">Or click the link below to verify your email:</p>
        <div class="text-center mt-4">
          <a href="${frontendUrl}/verify/email/${updatedUser.emailVerificationToken}" 
             class="bg-green-500 text-white px-4 py-2 rounded inline-block">
            Verify Email  
          </a>
        </div>
        <p class="text-gray-700 text-base mt-2">
          If you did not request this change, please contact support immediately.
        </p>
      `;
      const verificationEmailOptions = {
        to: email,
        subject: "Verify Your New Email Address",
        html: generateEmailLayout({
          title: "Verify Your New Email Address",
          bodyContent,
        }),
      };

      try {
        await sendMail(verificationEmailOptions);
        console.log("Verification email sent to", email);
      } catch (mailError) {
        console.error("Error sending verification email:", mailError);
      }
    }

    // Send notification email confirming profile update
    const notificationBodyContent = `
      <p class="text-gray-800 text-base">Dear ${updatedUser.username},</p>
      <p class="text-gray-700 text-base mt-2">
        Your profile has been successfully updated.
      </p>
      ${sendVerificationEmail ? `<p class="text-gray-700 text-base mt-2">Please note that you need to verify your new email address.</p>` : ""}
      <p class="text-gray-700 text-base mt-2">
        Thank you for keeping your information up-to-date.
      </p>
    `;
    const notificationEmailOptions = {
      to: updatedUser.email,
      subject: "Profile Updated",
      html: generateEmailLayout({
        title: "Profile Updated",
        bodyContent: notificationBodyContent,
      }),
    };

    try {
      await sendMail(notificationEmailOptions);
      console.log("Profile update notification email sent to", updatedUser.email);
    } catch (mailError) {
      console.error("Error sending profile update notification email:", mailError);
    }

    const userResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.username,
      middleName: updatedUser.middleName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber,
      bloodGroup: updatedUser.bloodGroup,
      address: updatedUser.address,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      emergencyContact: updatedUser.emergencyContact,
      // profilePicture: updatedUser.profilePicture,
      // bio: updatedUser.bio,
      // location: updatedUser.location,
      isEmailVerified: updatedUser.isEmailVerified,
      role: updatedUser.role,
      jobTitle: updatedUser.jobTitle,
    };

    return res.status(StatusCodes.OK).json({
      user: userResponse,
      message: sendVerificationEmail
        ? "Profile updated. Please verify your new email address."
        : "Profile updated successfully.",
    });
  } catch (error: any) {
    console.error("Error in updateUserProfileController:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update user profile",
      error: error?.stack || error?.message || error,
    });
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const { email, token, frontendUrl } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json("User not found");
    }

    if (user.emailVerificationToken !== token) {
      return res.status(StatusCodes.BAD_REQUEST).json("Invalid verification token");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });

    const bodyContent = `
      <p class="text-gray-800 text-base">Dear ${user.username},</p>
      <p class="text-gray-700 text-base mt-2">
        Your email has been successfully verified. Thank you!
      </p>
      <p class="text-gray-700 text-base mt-2">
        You can now access all the features of our application.
      </p>
      <div class="text-center mt-4">        <a href="${frontendUrl}" 
           class="bg-green-500 text-white px-4 py-2 rounded inline-block">
          Go to Dashboard
        </a>
      </div>
    `;

    const emailOptions = {
      to: user.email,
      subject: "Email Verification Successful 🎉",
      html: generateEmailLayout({
        title: "Email Verification Successful",
        bodyContent,
      }),
    };

    await sendMail(emailOptions);
    return res.status(StatusCodes.OK).json("Email verified successfully");
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: "Failed to verify email",
      error: error?.stack || error?.message || error,
    });
  }
};

export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        jobTitle: true,
        email: true,
        phoneNumber: true,
        isEmailVerified: true,
        role: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalUsers = await prisma.user.count();

    return res.status(StatusCodes.OK).json({
      users,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: "Failed to retrieve users",
      error: error?.stack || error?.message || error,
    });
  }
};

export const deleteUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!existingUser) {
      return res.status(StatusCodes.NOT_FOUND).json("User not found");
    }

    await prisma.user.delete({
      where: { id: Number(userId) },
    });

    const bodyContent = `
      <p class="text-gray-800 text-base">Dear ${existingUser.username},</p>
      <p class="text-gray-700 text-base mt-2">
        Your account has been deleted from our system.
      </p>
      <p class="text-gray-700 text-base mt-2">
        If you believe this was a mistake, please contact support immediately.
      </p>
    `;

    const emailOptions = {
      to: existingUser.email,
      subject: "Account Deletion Confirmation",
      html: generateEmailLayout({
        title: "Account Deletion Confirmation",
        bodyContent,
      }),
    };

    await sendMail(emailOptions);

    return res.status(StatusCodes.OK).json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete user",
      error: error?.stack || error?.message || error,
    });
  }
};

/**
 * Create user route i.e register
 * @name POST /api/user/register   
 * sss
 * req.body must contain all the filters:  username, email, password, phoneNumber
 * @return {user} - A user created with fields
 */
userRouter.post("/register", userRegisterController);

/**
 * authenticate user route i.e login
 * @name POST /api/user/login
 * req.body must contain all the filters: email, password, role
 * @return {user} - A user logged in with fields
 */
userRouter.post("/login", loginController);

/**
 * authenticate admin route i.e login
 * @name POST /api/user/admin-login
 * req.body must contain all the filters: email, password, role
 * @return {user} - A user logged in with fields
 */
// userRouter.post("/admin-login", userController.adminLoginController);

/**
 * send reset otp to user route i.e forgot password
 * @name POST /api/user/forgot-password
 * req.body must contain all the filters: email
 * @return {otp} - A user password reset link
 */
userRouter.post("/forgot-password", userForgotPasswordController);

/**
 * update user password route i.e reset password
 * @name PUT /api/user/reset-password
 * req.body must contain all the filters: password
 * @param / user-id, token from reset link
 * @return {password-reset-message} - An upadted user with new password
 */
// userRouter.put("/reset-password/:id/:token", userController.userUpdatePassword);

userRouter.post("/verify-email-and-otp-password", verifyEmailAndOTP);

/**fe
 * update user password route i.e reset password
 * @name POST /api/user/reset-password
 * req.body must contain all the filters: password
 * @param /  otp from e-mail and new-PASSWORD
 * @return {password-reset-message} - An upadted user with new password
 */
userRouter.post("/update/password", verifyEmailAndOTP);
userRouter.get('/users', getAllUsersController);
userRouter.patch("/profile/update", updateUserProfileController);
userRouter.post('/verify-email', verifyEmailController);
userRouter.post('/resend-verification', verifyEmailController);
userRouter.delete('/usersof/:userId', deleteUserController);
userRouter.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        jobTitle: true,
        isEmailVerified: true,
        blocked: true,
      },
    });
    res.status(StatusCodes.OK).json(updated);
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update user",
      error: error?.message || error,
    });
  }
});

userRouter.patch('/users/:id/block', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { blocked } = req.body;
    const updated = await prisma.user.update({
      where: { id },
      data: { blocked: Boolean(blocked) },
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        blocked: true,
      },
    });
    res.status(StatusCodes.OK).json(updated);
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update block status",
      error: error?.message || error,
    });
  }
});


export default userRouter;
