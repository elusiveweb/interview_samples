<?php namespace ec_main\models;
/**
 * Primary User Class
 *
 * This class acts as an interface to the user's account and session
 * information. Standard CRUD (Create, Retrieve, Update, Delete) class
 * with additional methods for handling logging in and out.
 *
 * @license http://opensource.org/licenses/gpl-license.php GNU Public License
 * @copyright Copyright (c) 2013, Roger Soucy
 * @author Roger Soucy <roger.soucy@elusive-concepts.com>
 * @version 1.0
 * @package qsn
 */

use \elusive\core\Request;
use \elusive\debug\Debug;
use \ec_main\lib\Model;

class User extends Model
{
	/**
	 * User Level Constants
	 */
	const ROLE_0 = "Inactive";
	const ROLE_1 = "Customer Administrator";
	const ROLE_2 = "Customer Administrator";
	const ROLE_3 = "Customer Administrator";
	const ROLE_4 = "Solutions Consultant";
	const ROLE_5 = "Solutions Consultant";
	const ROLE_6 = "Solutions Consultant";
	const ROLE_7 = "Super Administrator";
	const ROLE_8 = "Super Administrator";
	const ROLE_9 = "Super Administrator";

	private $request = NULL;
	private $auth    = FALSE;
	protected $data  = array();


	/**
	 * MySQL Queries to prepare
	 */
	static protected $queries = array(
		'access' => "SELECT role FROM users WHERE id = :user_id",
		'create' => "INSERT INTO users VALUES (NULL, :role, :email, :pword, :fname, :lname, :region, NOW(), NOW(), 0)",
		'delete' => "DELETE FROM users WHERE id=:user_id",
		'exists' => "SELECT id FROM users WHERE email = :email",
		'getall' => "SELECT * FROM users",
		'select' => "SELECT * FROM users WHERE id=:user_id",
		'unique' => "SELECT id FROM users WHERE email=:value && id != :user_id",
		'update' => "UPDATE users SET role=:role, email=:email, pword=:pword, fname=:fname, lname=:lname, region=:region, modified=NOW() WHERE id=:user_id",
		'verify' => "SELECT id, role, pword FROM users WHERE email=:email",
		'llogin' => "UPDATE users SET last_login=NOW() WHERE id=:user_id",
	);


	/**
	 * Class Constructor
	 *
	 * The constructor sets up the data access object, then loads user data
	 * based on session information if the user is logged in.
	 *
	 * @param string $uid For pulling specific user records (default: FALSE)
	 */
	public function __construct($uid = FALSE)
	{
		// INITIATE DATABASE OBJECT THROUGH PARENT
		parent::__construct();

		$this->request = Request::get_instance();

		// Session Setup
		// The ability to pass a session ID is required for user uploads
		if(isset($this->request->data['POST']['SID']))
		{
			session_id($this->request->data['POST']['SID']);
		}
		if(empty($_SESSION)) { session_start(); }

		// Set a default non-existant user id
		$this->set("user_id", 0);

		// If we were passed a user ID, use that
		if(is_numeric($uid)) { $this->set("user_id", $uid); }

		// Otherwise, grab one from the session if it exists
		else if(isset($_SESSION['uid']) && $_SESSION['uid'] != '')
		{
			$this->set("user_id", $_SESSION['uid']);

			if(isset($_SESSION['auth']) && $_SESSION['auth'] = 'TRUE')
			{
				$this->auth = TRUE;
			}
		}

		// Populate User Data
		$this->populate_data();
	}


	/**
	 * Password Hashing Function
	 *
	 * @param string $pass password to be hashed
	 *
	 * @return string
	 */
	static public function pw_hash($pass)
	{
		return crypt($pass);
	}


	/**
	 * All User Listing Function
	 *
	 * @return array
	 */
	static public function get_all_users()
	{
		$accounts = self::query('getall');

		if(!isset($accounts[0]['access'])) { return array(); }
		else
		{
			$users = array();

			foreach($accounts as $account)
			{
				$users[$account['id']] = $account;
			}

			return $users;
		}
	}


	/**
	 * User Login Function
	 *
	 * Checks for an active record in the user table using supplied email
	 * and password. If a record is found, returns boolean TRUE, unless
	 * the account is not activated, in which case the string 'INACTIVE'
	 * is returned. Also sets session variables for persistence and records
	 * the user's last login date
	 *
	 * @param array $data associative array of email and password
	 *
	 * @return mixed
	 */
	public function login($data)
	{
		$result = self::query('verify', $data);

		$result = is_array($result) && isset($result[0]) ? $result[0] : $result;

		if(!isset($result['role']))  { self::error('misc', 'No record found!', __METHOD__); return FALSE; }
		else if($result['role'] < 1) { return 'INACTIVE'; }

		$id   = $result['id'];
		$pass = $data['pword']; //crypt($data['pword'], $result['pword']);

		if($pass != $result['pword']) { self::error('misc', 'Incorrect Password!'); return FALSE; }
		if(!is_numeric($id))          { self::error('misc', 'Invalid ID Returned'); return FALSE; }

		$this->set("user_id", $id);
		$this->populate_data();
		self::query('llogin', $this->data);

		$_SESSION['uid']  = $id;
		$_SESSION['auth'] = 'TRUE';

		$this->auth = TRUE;
		return TRUE;
	}


	/**
	 * User Logout Function
	 *
	 * Clears authorization and session variables.
	 */
	public function logout()
	{
		if($this->auth)
		{
			$_SESSION['auth'] = FALSE;
			$_SESSION['uid']  = FALSE;
			unset($_SESSION['auth']);
			unset($_SESSION['uid']);
			$this->auth = FALSE;
		}
	}


	/**
	 * Create New User
	 *
	 * Creates a new user using supplied data provided no existing user is
	 * found in the database.
	 *
	 * @param array $data
	 *
	 * @return mixed
	 */
	public function create($data)
	{
		if(!isset($data['email'])) { self::error('required', 'email'); return FALSE; }

		$result = self::query('exists', $data);

		$result = is_array($result) ? $result[0] : $result;

		if(!isset($result['id']) || $result['id'] < 1)
		{
			// No existing record, so create one
			return $this->save($data);
		}
		else
		{
			trigger_error(__METHOD__.': No ID returned from database!');
			return FALSE;
		}
	}


	/**
	 * Remove a user account
	 *
	 * @param int $user_id user id to remove
	 *
	 * @return boolean
	 */
	public function remove($user_id)
	{
		if(!is_numeric($user_id)) { return FALSE; }

		$result = self::query('delete', array('user_id'=>$user_id), 'ROW_COUNT');

		if($result < 1)
		{
			self::error('misc', "Could not delete user id {$user_id}");
			return FALSE;
		}
		return TRUE;
	}


	/**
	 * Get the value of a data field
	 *
	 * @param string $field field name to return (or format name)
	 * @param boolean $formatted optional
	 */
	public function get($field, $formatted = FALSE)
	{
		return ($formatted) ? $this->format($field) : $this->data[$field];
	}


	/**
	 *Pass data fields through a formatter and return results
	 *
	 * @param string $field field or format name
	 *
	 * @return string
	 */
	private function format($field)
	{
		$f = '';
		$d = $this->data;

		switch($field)
		{
			default: $f = $this->data[$field];
		}

		return $f;
	}


	/**
	 * Return user level for current user or for a given level
	 *
	 * @param int $level optional used to get the name of a specific level
	 *
	 * @return string
	 */
	public function get_role($level = FALSE)
	{
		$lvl = (is_numeric($level)) ? $level : $this->data['role'];

		return constant('\svnserv\models\User::ROLE_' . $lvl);
	}


	/**
	 * Individually set a data field
	 *
	 * @param string $field data field to set
	 * @param string $value data value
	 */
	public function set($field, $value)
	{
		$this->data[$field] = $value;
	}


	/**
	 * Update multiple data fields and save user
	 *
	 * @param array $data optional associative array of data fields and values
	 *
	 * @return mixed
	 */
	public function update($data)
	{
		foreach($data as $k => $v)
		{
			$this->data[$k] = $v;
		}
		return $this->save();
	}


	/**
	 * Check if the user is logged in
	 *
	 * @return boolean
	 */
	public function logged_in()
	{
		return $this->auth;
	}


	/**
	 * Populate User Data
	 *
	 * Populates the data array based on the current data user_id value.
	 *
	 * @return boolean
	 */
	private function populate_data()
	{
		$d = self::query('select', $this->data);

		if(!isset($d[0]['id']))
		{
			self::error('misc', 'No record found!', __METHOD__);
			return FALSE;
		}
		else
		{
			foreach($d[0] as $k => $v) { $this->data[$k] = ($v == "NULL") ? "" : $v; }
			return TRUE;
		}
	}


	/**
	 * Save User Data
	 *
	 * Checks for an existing record in the user table using the current user
	 * data. If a record is found it is updated, and if not it is created.
	 *
	 * @param array $data optional associative array of account information
	 *
	 * @return mixed
	 */
	private function save($data = FALSE)
	{
		if($data === FALSE) { $data = $this->data; }

		$result = self::query('exists', $data);

		// No existing record, so create one
		if(!isset($result[0]['id']) || $result[0]['id'] < 1)
		{
			$uid = self::query('create', $data, 'LAST_INSERT_ID');

			if(!$uid) { self::error('misc', 'Database did not return an ID!'); return FALSE; }
			else      { return $uid; }
		}

		// Existing record, so update it
		else
		{
			$data['user_id'] = $result[0]['id'];

			$rows = self::query('update', $data, 'ROW_COUNT');

			if($rows < 1) { echo 'no rows'; self::error('misc', 'No rows updated!'); return FALSE;  }
			else          { return $data['user_id']; }
		}
	}

	/**
	 *
	 */
	protected function format_data($k, $v)
	{
		if(preg_match("/email|e-mail/", $k))   { $v = strtolower($v); }
		//if(preg_match("/pword|password/", $k)) { $v = md5($v); }

		return $v;

	}

	/**
	 *
	 */
	public function dump()
	{
		\elusive\debug\Debug::log('<pre>' . __CLASS__ . ':' . print_r($this->data,1) . '</pre>');
	}
}
