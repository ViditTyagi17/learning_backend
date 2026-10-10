import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { refreshToken, accessToken }
  } catch (error) {
    throw new ApiError(500, "something went wrong while genreating access and refresh token")
  }

}

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body

  console.log("email", email)

  if (
    [username, fullName, email, password].some((field) => !field?.trim())
  ) {
    throw new ApiError(400, "All fields are required ")
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (existedUser) {
    throw new ApiError(409, "user with username or email already exist")
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password

  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user")
  }


  return res.status(201).json(
    new ApiResponse(201, createdUser, "User register successfully")
  )
})

const loginUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body

  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")

  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect")
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200,
        {
          user: loggedInUser, accessToken, refreshToken
        }, "User logged In Successfully")
    )
})

const logoutUser = asyncHandler(async (req, res) => {

  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 }
  }, {
    new: true
  })


  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is required")
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken._id)
    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or already used")
    }
    const { refreshToken, accessToken } = await generateAccessTokenAndRefreshToken(user._id)

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Refresh Token")

  }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken }